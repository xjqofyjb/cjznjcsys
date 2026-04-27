import type { Context } from "hono";
import { all, first } from "../lib/db";
import type { AppEnv, AuthUser, UserRole, UserRow } from "../lib/types";
import {
  bytesToHex,
  decodeBase64,
  encodeBase64,
  hexToBytes,
  jsonId,
  nowIso,
  plusHoursIso,
  sha256HexString,
  unauthorized,
} from "../lib/utils";

const DEFAULT_PASSWORD_ITERATIONS = 100000;
const DEFAULT_SESSION_TTL_HOURS = 168;

function userToAuthUser(user: Pick<UserRow, "id" | "email" | "display_name" | "role" | "status" | "last_login_at">): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    status: user.status,
    lastLoginAt: user.last_login_at,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function looksLikeHex(value: string) {
  return value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value);
}

function decodeSalt(input: string) {
  return looksLikeHex(input) ? hexToBytes(input) : decodeBase64(input);
}

async function derivePasswordDigest(password: string, saltValue: string, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: decodeSalt(saltValue),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  return new Uint8Array(bits);
}

async function createPasswordRecord(password: string, iterations = DEFAULT_PASSWORD_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bytesToHex(salt);
  const digest = await derivePasswordDigest(password, saltHex, iterations);

  return {
    salt: saltHex,
    hash: bytesToHex(digest),
    iterations,
  };
}

async function verifyPassword(password: string, user: Pick<UserRow, "password_hash" | "password_salt" | "password_iterations">) {
  if (!user.password_hash || !user.password_salt) {
    return false;
  }

  const digest = await derivePasswordDigest(password, user.password_salt, user.password_iterations || DEFAULT_PASSWORD_ITERATIONS);
  const computed = looksLikeHex(user.password_hash) ? bytesToHex(digest) : encodeBase64(digest);
  return computed === user.password_hash;
}

function getSessionTtlHours(env: AppEnv) {
  const parsed = Number(env.SESSION_TTL_HOURS || DEFAULT_SESSION_TTL_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_TTL_HOURS;
}

async function createSession(env: AppEnv, user: UserRow, metadata?: { ipAddress?: string | null; userAgent?: string | null }) {
  const rawToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const tokenHash = await sha256HexString(rawToken);
  const now = nowIso();
  const expiresAt = plusHoursIso(getSessionTtlHours(env));

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO user_sessions (
        id, user_id, token_hash, created_at, updated_at, expires_at, last_seen_at, ip_address, user_agent
      ) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?4, ?6, ?7)`,
    ).bind(
      jsonId("sess"),
      user.id,
      tokenHash,
      now,
      expiresAt,
      metadata?.ipAddress ?? null,
      metadata?.userAgent ?? null,
    ),
    env.DB.prepare(
      "UPDATE users SET last_login_at = ?2, updated_at = ?2 WHERE id = ?1",
    ).bind(user.id, now),
  ]);

  return {
    token: rawToken,
    expiresAt,
    user: userToAuthUser({ ...user, last_login_at: now }),
  };
}

export async function findUserByEmail(env: AppEnv, email: string) {
  return first<UserRow>(
    env.DB.prepare(
      `SELECT
        id, email, display_name, role, status, password_hash, password_salt,
        password_iterations, password_updated_at, last_login_at, created_at, updated_at
      FROM users
      WHERE email = ?1
      LIMIT 1`,
    ).bind(normalizeEmail(email)),
  );
}

export async function bootstrapAdminPassword(env: AppEnv, input: { email: string; password: string; displayName?: string }) {
  const email = normalizeEmail(input.email);
  const admin = await first<UserRow>(
    env.DB.prepare(
      `SELECT
        id, email, display_name, role, status, password_hash, password_salt,
        password_iterations, password_updated_at, last_login_at, created_at, updated_at
      FROM users
      WHERE email = ?1 AND role = 'admin'
      LIMIT 1`,
    ).bind(email),
  );

  if (!admin || admin.status !== "active") {
    return { error: "Admin user not found or inactive" as const };
  }

  if (admin.password_hash) {
    return { error: "Admin password is already configured" as const };
  }

  const password = await createPasswordRecord(input.password);
  const now = nowIso();

  await env.DB.prepare(
    `UPDATE users
     SET display_name = ?2,
         password_hash = ?3,
         password_salt = ?4,
         password_iterations = ?5,
         password_updated_at = ?6,
         updated_at = ?6
     WHERE id = ?1`,
  ).bind(
    admin.id,
    input.displayName?.trim() || admin.display_name,
    password.hash,
    password.salt,
    password.iterations,
    now,
  ).run();

  const updatedAdmin = await findUserByEmail(env, email);
  if (!updatedAdmin) {
    return { error: "Failed to update admin user" as const };
  }

  return createSession(env, updatedAdmin);
}

export async function loginWithPassword(
  env: AppEnv,
  input: { email: string; password: string },
  metadata?: { ipAddress?: string | null; userAgent?: string | null },
) {
  const user = await findUserByEmail(env, input.email);
  if (!user || user.status !== "active") {
    return null;
  }

  const ok = await verifyPassword(input.password, user);
  if (!ok) {
    return null;
  }

  return createSession(env, user, metadata);
}

export async function revokeSession(env: AppEnv, token: string) {
  const tokenHash = await sha256HexString(token);
  await env.DB.prepare(
    "UPDATE user_sessions SET revoked_at = ?2, updated_at = ?2 WHERE token_hash = ?1 AND revoked_at IS NULL",
  ).bind(tokenHash, nowIso()).run();
}

export async function getAuthUser<E extends { Bindings: AppEnv }>(c: Context<E>): Promise<AuthUser | Response> {
  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return unauthorized();
  }

  const token = authorization.replace("Bearer ", "").trim();
  const tokenHash = await sha256HexString(token);
  const now = nowIso();

  const session = await first<
    UserRow & {
      session_id: string;
      session_expires_at: string;
      session_revoked_at: string | null;
    }
  >(
    c.env.DB.prepare(
      `SELECT
        u.id,
        u.email,
        u.display_name,
        u.role,
        u.status,
        u.password_hash,
        u.password_salt,
        u.password_iterations,
        u.password_updated_at,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        s.id as session_id,
        s.expires_at as session_expires_at,
        s.revoked_at as session_revoked_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1
      LIMIT 1`,
    ).bind(tokenHash),
  );

  if (!session || session.status !== "active" || session.session_revoked_at || session.session_expires_at <= now) {
    return unauthorized("Session is invalid or expired");
  }

  await c.env.DB.prepare(
    "UPDATE user_sessions SET last_seen_at = ?2, updated_at = ?2 WHERE id = ?1",
  ).bind(session.session_id, now).run();

  return userToAuthUser(session);
}

export async function listSessionsForUser(env: AppEnv, userId: string) {
  return all(
    env.DB.prepare(
      `SELECT
        id,
        created_at,
        updated_at,
        expires_at,
        revoked_at,
        last_seen_at,
        ip_address,
        user_agent
      FROM user_sessions
      WHERE user_id = ?1
      ORDER BY created_at DESC`,
    ).bind(userId),
  );
}

export async function createUserWithPassword(
  env: AppEnv,
  input: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
    status?: "active" | "disabled";
  },
) {
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(env, email);
  if (existing) {
    return { error: "User already exists" as const };
  }

  const password = await createPasswordRecord(input.password);
  const now = nowIso();
  const userId = jsonId("user");

  await env.DB.prepare(
    `INSERT INTO users (
      id, email, display_name, role, status, password_hash, password_salt,
      password_iterations, password_updated_at, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)`,
  ).bind(
    userId,
    email,
    input.displayName.trim(),
    input.role,
    input.status ?? "active",
    password.hash,
    password.salt,
    password.iterations,
    now,
    now,
  ).run();

  return findUserByEmail(env, email);
}

export async function updateManagedUser(
  env: AppEnv,
  userId: string,
  input: {
    displayName?: string;
    role?: UserRole;
    status?: "active" | "disabled";
    password?: string;
  },
) {
  const user = await first<UserRow>(
    env.DB.prepare(
      `SELECT
        id, email, display_name, role, status, password_hash, password_salt,
        password_iterations, password_updated_at, last_login_at, created_at, updated_at
      FROM users
      WHERE id = ?1
      LIMIT 1`,
    ).bind(userId),
  );

  if (!user) {
    return null;
  }

  const nextDisplayName = input.displayName?.trim() || user.display_name;
  const nextRole = input.role || user.role;
  const nextStatus = input.status || user.status;
  let nextPasswordHash = user.password_hash;
  let nextPasswordSalt = user.password_salt;
  let nextPasswordIterations = user.password_iterations;
  let nextPasswordUpdatedAt = user.password_updated_at;
  const now = nowIso();

  if (input.password) {
    const password = await createPasswordRecord(input.password);
    nextPasswordHash = password.hash;
    nextPasswordSalt = password.salt;
    nextPasswordIterations = password.iterations;
    nextPasswordUpdatedAt = now;
  }

  await env.DB.prepare(
    `UPDATE users
     SET display_name = ?2,
         role = ?3,
         status = ?4,
         password_hash = ?5,
         password_salt = ?6,
         password_iterations = ?7,
         password_updated_at = ?8,
         updated_at = ?9
     WHERE id = ?1`,
  ).bind(
    userId,
    nextDisplayName,
    nextRole,
    nextStatus,
    nextPasswordHash,
    nextPasswordSalt,
    nextPasswordIterations,
    nextPasswordUpdatedAt,
    now,
  ).run();

  if (input.password || nextStatus === "disabled") {
    await env.DB.prepare(
      "UPDATE user_sessions SET revoked_at = ?2, updated_at = ?2 WHERE user_id = ?1 AND revoked_at IS NULL",
    ).bind(userId, now).run();
  }

  return first<UserRow>(
    env.DB.prepare(
      `SELECT
        id, email, display_name, role, status, password_hash, password_salt,
        password_iterations, password_updated_at, last_login_at, created_at, updated_at
      FROM users
      WHERE id = ?1
      LIMIT 1`,
    ).bind(userId),
  );
}
