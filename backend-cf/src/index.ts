import { Hono } from "hono";
import type { AppEnv } from "./lib/types";
import { authRoutes } from "./routes/auth";
import { uploadRoutes } from "./routes/uploads";
import { adminRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";

const app = new Hono<{ Bindings: AppEnv }>();

function resolveAllowedOrigin(requestOrigin: string | null, env: AppEnv) {
  if (!requestOrigin) {
    return env.PUBLIC_APP_URL || "*";
  }

  const normalizedPublicUrl = (env.PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (requestOrigin === normalizedPublicUrl) {
    return requestOrigin;
  }

  if (requestOrigin.endsWith(".pages.dev")) {
    return requestOrigin;
  }

  if (requestOrigin.startsWith("http://localhost:") || requestOrigin.startsWith("http://127.0.0.1:")) {
    return requestOrigin;
  }

  return normalizedPublicUrl || "*";
}

app.use("*", async (c, next) => {
  const requestOrigin = c.req.header("Origin") ?? null;
  await next();
  c.header("Access-Control-Allow-Origin", resolveAllowedOrigin(requestOrigin, c.env));
  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  c.header("Vary", "Origin");
});

app.options("*", (c) => c.body(null, 204));

app.get("/", (c) =>
  c.json({
    service: "research-data-platform-api",
    env: c.env.APP_ENV,
    status: "ok",
  }),
);

app.get("/healthz", (c) =>
  c.json({
    ok: true,
    service: "research-data-platform-api",
    timestamp: new Date().toISOString(),
  }),
);

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/public", publicRoutes);
app.route("/api/v1/uploads", uploadRoutes);
app.route("/api/v1/admin", adminRoutes);

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<unknown>, env: AppEnv) {
    const now = new Date().toISOString();

    for (const message of batch.messages) {
      const body = message.body as { assetId?: string } | undefined;
      if (!body?.assetId) {
        message.ack();
        continue;
      }

      await env.DB.prepare(
        "UPDATE assets SET status = 'ready', updated_at = ?2 WHERE id = ?1",
      ).bind(body.assetId, now).run();

      await env.DB.prepare(
        "UPDATE jobs SET status = 'completed', result_json = ?2, updated_at = ?3 WHERE asset_id = ?1 AND status = 'queued'",
      ).bind(body.assetId, JSON.stringify({ completedAt: now }), now).run();

      message.ack();
    }
  },
};
