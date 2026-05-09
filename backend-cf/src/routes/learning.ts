import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { badRequest } from "../lib/utils";
import { getAuthUser } from "../services/auth";
import { listApprovedLearningResources, submitLearningResource } from "../services/learning";

export const learningRoutes = new Hono<{ Bindings: AppEnv }>();

function normalizeUrl(value?: string) {
  const trimmed = value?.trim() || "";
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    return "";
  }
}

learningRoutes.get("/", async (c) => {
  return c.json({ items: await listApprovedLearningResources(c.env) });
});

learningRoutes.post("/", async (c) => {
  const user = await getAuthUser(c);
  if (user instanceof Response) {
    return user;
  }

  const body = await c.req.json<{
    title?: string;
    description?: string;
    resourceType?: string;
    resourceUrl?: string;
    citation?: string;
    tags?: string[];
  }>().catch(() => null);

  if (!body?.title?.trim() || !body?.resourceType?.trim()) {
    return badRequest("title and resourceType are required");
  }

  const resourceUrl = normalizeUrl(body.resourceUrl);
  if (body.resourceUrl?.trim() && !resourceUrl) {
    return badRequest("resourceUrl must be a valid URL");
  }

  const created = await submitLearningResource(c.env, user, {
    title: body.title,
    description: body.description,
    resourceType: body.resourceType,
    resourceUrl: resourceUrl || undefined,
    citation: body.citation,
    tags: Array.isArray(body.tags) ? body.tags : [],
  });

  return c.json({ item: created }, 201);
});
