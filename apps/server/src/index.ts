import { Hono } from "hono";
import { serve } from "@hono/node-server";

import { env } from "@config/env";
import { logger } from "@config/logger";
import webhook from "./routes/webhook";

const app = new Hono();
app.route("/webhook", webhook);

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT ?? 3000);

serve({
  fetch: app.fetch,
  port
});

logger.info({ port }, "server listening");
logger.info(
  {
  hasDbUrl: Boolean(env.DATABASE_URL),
  hasRedisUrl: Boolean(env.REDIS_URL)
  },
  "env check"
);

