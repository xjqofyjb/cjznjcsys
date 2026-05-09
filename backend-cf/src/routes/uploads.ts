import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { badRequest, forbidden, notFound } from "../lib/utils";
import { getAuthUser } from "../services/auth";
import { completeUpload, createUploadSession, getUploadSession, listOwnAssets, listOwnUploadSessions, uploadPart } from "../services/uploads";

export const uploadRoutes = new Hono<{ Bindings: AppEnv }>();

uploadRoutes.post("/sessions", async (c) => {
  const user = await getAuthUser(c);
  if (user instanceof Response) {
    return user;
  }

  if (user.role === "viewer") {
    return forbidden("Uploader or admin role required");
  }

  const body = await c.req.json<{
    title?: string;
    description?: string;
    datasetKind?: string;
    fileName?: string;
    fileSize?: number;
    contentType?: string;
    labKey?: string;
    versionLabel?: string;
    visibility?: "private" | "lab" | "public";
    metadata?: Record<string, unknown>;
  }>().catch(() => null);

  if (!body?.title || !body?.datasetKind || !body?.fileName || !body?.fileSize) {
    return badRequest("title, datasetKind, fileName, and fileSize are required");
  }

  const session = await createUploadSession(c.env, user, {
    title: body.title,
    description: body.description,
    datasetKind: body.datasetKind,
    fileName: body.fileName,
    fileSize: body.fileSize,
    contentType: body.contentType,
    labKey: body.labKey,
    versionLabel: body.versionLabel,
    visibility: body.visibility,
    metadata: body.metadata,
  });

  return c.json(session, 201);
});

uploadRoutes.get("/sessions/:sessionId", async (c) => {
  const user = await getAuthUser(c);
  if (user instanceof Response) {
    return user;
  }

  const session = await getUploadSession(c.env, c.req.param("sessionId"), user);
  if (!session) {
    return notFound("Upload session not found");
  }

  return c.json(session);
});

uploadRoutes.put("/sessions/:sessionId/parts/:partNumber", async (c) => {
  const user = await getAuthUser(c);
  if (user instanceof Response) {
    return user;
  }

  const partNumber = Number(c.req.param("partNumber"));
  if (!Number.isInteger(partNumber) || partNumber < 1) {
    return badRequest("partNumber must be a positive integer");
  }

  const session = await getUploadSession(c.env, c.req.param("sessionId"), user);
  if (!session) {
    return notFound("Upload session not found");
  }

  const uploaded = await uploadPart(c.env, session, partNumber, c.req.raw.body);
  return c.json(uploaded, 201);
});

uploadRoutes.post("/sessions/:sessionId/complete", async (c) => {
  const user = await getAuthUser(c);
  if (user instanceof Response) {
    return user;
  }

  const session = await getUploadSession(c.env, c.req.param("sessionId"), user);
  if (!session) {
    return notFound("Upload session not found");
  }

  const completed = await completeUpload(c.env, session);
  return c.json(completed);
});

uploadRoutes.get("/sessions", async (c) => {
  const user = await getAuthUser(c);
  if (user instanceof Response) {
    return user;
  }

  return c.json({ items: await listOwnUploadSessions(c.env, user) });
});

uploadRoutes.get("/assets", async (c) => {
  const user = await getAuthUser(c);
  if (user instanceof Response) {
    return user;
  }

  return c.json({ items: await listOwnAssets(c.env, user) });
});
