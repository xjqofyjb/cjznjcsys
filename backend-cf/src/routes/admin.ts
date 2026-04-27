import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { badRequest, forbidden, notFound } from "../lib/utils";
import { getAuthUser } from "../services/auth";
import {
  archiveAsset,
  deleteAsset,
  getAssetDetails,
  getDashboard,
  listAdminActions,
  listAssets,
  listUploads,
  listUsers,
  recordAdminAction,
  restoreAsset,
  updateAsset,
} from "../services/admin";
import type { AuthUser } from "../lib/types";
import { createUserWithPassword, updateManagedUser } from "../services/auth";

export const adminRoutes = new Hono<{ Bindings: AppEnv; Variables: { authUser: AuthUser } }>();

adminRoutes.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (user instanceof Response) {
    return user;
  }

  if (user.role !== "admin") {
    return forbidden("Admin role required");
  }

  c.set("authUser", user);
  await next();
});

adminRoutes.get("/dashboard", async (c) => {
  return c.json(await getDashboard(c.env));
});

adminRoutes.get("/uploads", async (c) => {
  return c.json({ items: await listUploads(c.env) });
});

adminRoutes.get("/assets", async (c) => {
  return c.json({ items: await listAssets(c.env) });
});

adminRoutes.get("/assets/:assetId", async (c) => {
  const details = await getAssetDetails(c.env, c.req.param("assetId"));
  if (!details) {
    return notFound("Asset not found");
  }

  return c.json(details);
});

adminRoutes.patch("/assets/:assetId", async (c) => {
  const user = c.get("authUser");
  const assetId = c.req.param("assetId");
  const body = await c.req.json<{
    title?: string;
    description?: string | null;
    visibility?: "private" | "lab" | "public";
    status?: "draft" | "uploading" | "uploaded" | "processing" | "ready" | "archived" | "failed";
    labKey?: string | null;
    metadata?: Record<string, unknown> | null;
  }>().catch(() => null);

  if (!body) {
    return badRequest("A JSON body is required");
  }

  const updated = await updateAsset(c.env, assetId, body);
  if (!updated) {
    return notFound("Asset not found");
  }

  await recordAdminAction(c.env, user, "asset", assetId, "update", body);
  return c.json(updated);
});

adminRoutes.post("/assets/:assetId/archive", async (c) => {
  const user = c.get("authUser");
  const assetId = c.req.param("assetId");

  const ok = await archiveAsset(c.env, assetId);
  if (!ok) {
    return notFound("Asset not found");
  }

  await recordAdminAction(c.env, user, "asset", assetId, "archive");
  return c.json({ ok: true, assetId, status: "archived" });
});

adminRoutes.post("/assets/:assetId/delete", async (c) => {
  const user = c.get("authUser");
  const assetId = c.req.param("assetId");

  const ok = await deleteAsset(c.env, assetId);
  if (!ok) {
    return notFound("Asset not found");
  }

  await recordAdminAction(c.env, user, "asset", assetId, "delete");
  return c.json({ ok: true, assetId, status: "deleted" });
});

adminRoutes.post("/assets/:assetId/restore", async (c) => {
  const user = c.get("authUser");
  const assetId = c.req.param("assetId");

  const ok = await restoreAsset(c.env, assetId);
  if (!ok) {
    return notFound("Asset not found");
  }

  await recordAdminAction(c.env, user, "asset", assetId, "restore");
  return c.json({ ok: true, assetId, status: "ready" });
});

adminRoutes.get("/actions", async (c) => {
  return c.json({ items: await listAdminActions(c.env) });
});

adminRoutes.get("/users", async (c) => {
  return c.json({ items: await listUsers(c.env) });
});

adminRoutes.post("/users", async (c) => {
  const admin = c.get("authUser");
  const body = await c.req.json<{
    email?: string;
    password?: string;
    displayName?: string;
    role?: "admin" | "uploader" | "viewer";
    status?: "active" | "disabled";
  }>().catch(() => null);

  if (!body?.email || !body?.password || !body?.displayName || !body?.role) {
    return badRequest("email, password, displayName, and role are required");
  }

  if (body.password.trim().length < 10) {
    return badRequest("password must be at least 10 characters");
  }

  const created = await createUserWithPassword(c.env, {
    email: body.email,
    password: body.password,
    displayName: body.displayName,
    role: body.role,
    status: body.status,
  });

  if (created && "error" in created) {
    return Response.json({ error: created.error }, { status: 409 });
  }

  if (!created) {
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }

  await recordAdminAction(c.env, admin, "user", created.id, "create", {
    email: created.email,
    role: created.role,
    status: created.status,
  });

  return c.json({ user: created }, 201);
});

adminRoutes.patch("/users/:userId", async (c) => {
  const admin = c.get("authUser");
  const userId = c.req.param("userId");
  const body = await c.req.json<{
    displayName?: string;
    role?: "admin" | "uploader" | "viewer";
    status?: "active" | "disabled";
    password?: string;
  }>().catch(() => null);

  if (!body) {
    return badRequest("A JSON body is required");
  }

  if (body.password !== undefined && body.password.trim().length < 10) {
    return badRequest("password must be at least 10 characters");
  }

  if (userId === admin.id && body.status === "disabled") {
    return badRequest("You cannot disable your own admin account");
  }

  if (userId === admin.id && body.role && body.role !== "admin") {
    return badRequest("You cannot remove your own admin role");
  }

  const updated = await updateManagedUser(c.env, userId, body);
  if (!updated) {
    return notFound("User not found");
  }

  await recordAdminAction(c.env, admin, "user", userId, "update", {
    displayName: body.displayName,
    role: body.role,
    status: body.status,
    passwordReset: body.password !== undefined,
  });

  return c.json({ user: updated });
});
