import { Hono } from "hono";
import {
  bootstrapAdminPassword,
  getAuthUser,
  listSessionsForUser,
  loginWithPassword,
  revokeSession,
} from "../services/auth";
import type { AppEnv } from "../lib/types";
import { badRequest } from "../lib/utils";

export const authRoutes = new Hono<{ Bindings: AppEnv }>();

function getClientMetadata(c: Parameters<typeof getAuthUser>[0]) {
  return {
    ipAddress: c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? null,
    userAgent: c.req.header("User-Agent") ?? null,
  };
}

function validatePassword(password: string) {
  return password.trim().length >= 10;
}

authRoutes.post("/bootstrap", async (c) => {
  try {
    const body = await c.req.json<{ email?: string; password?: string; displayName?: string }>().catch(() => null);
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password ?? "";

    if (!email || !password) {
      return badRequest("email and password are required");
    }

    if (!validatePassword(password)) {
      return badRequest("password must be at least 10 characters");
    }

    const issued = await bootstrapAdminPassword(c.env, {
      email,
      password,
      displayName: body?.displayName,
    });

    if ("error" in issued) {
      return Response.json({ error: issued.error }, { status: issued.error.includes("already configured") ? 409 : 404 });
    }

    return c.json(issued, 201);
  } catch (error) {
    console.error("auth.bootstrap.failed", error);
    return Response.json(
      {
        error: "Bootstrap failed",
        detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      },
      { status: 500 },
    );
  }
});

authRoutes.post("/login", async (c) => {
  try {
    const body = await c.req.json<{ email?: string; password?: string }>().catch(() => null);
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password ?? "";

    if (!email || !password) {
      return badRequest("email and password are required");
    }

    const issued = await loginWithPassword(c.env, { email, password }, getClientMetadata(c));
    if (!issued) {
      return Response.json({ error: "Invalid credentials or inactive account" }, { status: 401 });
    }

    return c.json(issued);
  } catch (error) {
    console.error("auth.login.failed", error);
    return Response.json(
      {
        error: "Login failed",
        detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      },
      { status: 500 },
    );
  }
});

authRoutes.get("/me", async (c) => {
  const user = await getAuthUser(c);
  if (user instanceof Response) {
    return user;
  }

  return c.json({ user });
});

authRoutes.get("/sessions", async (c) => {
  const user = await getAuthUser(c);
  if (user instanceof Response) {
    return user;
  }

  return c.json({ items: await listSessionsForUser(c.env, user.id) });
});

authRoutes.post("/logout", async (c) => {
  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ ok: true });
  }

  await revokeSession(c.env, authorization.replace("Bearer ", "").trim());
  return c.json({ ok: true });
});
