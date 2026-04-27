import { Hono } from "hono";
import type { AppEnv } from "../lib/types";
import { listPublicAssets } from "../services/public";

export const publicRoutes = new Hono<{ Bindings: AppEnv }>();

publicRoutes.get("/assets", async (c) => {
  const labKey = c.req.query("lab") || undefined;
  const datasetKind = c.req.query("datasetKind") || undefined;
  const centerKey = c.req.query("centerKey") || undefined;
  const limit = c.req.query("limit") || undefined;

  return c.json({
    items: await listPublicAssets(c.env, {
      labKey,
      datasetKind,
      centerKey,
      limit: limit ? Number(limit) : undefined,
    }),
  });
});
