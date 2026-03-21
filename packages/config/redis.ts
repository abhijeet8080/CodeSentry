import type { RedisOptions } from "ioredis";
import { env } from "./env";

/**
 * Options for BullMQ (it forwards these to its bundled ioredis). Use a plain
 * object — not `new Redis()` from the app — so types match BullMQ's ioredis.
 *
 * Upstash: parse `REDIS_URL` but use `URL` username/password as-is (already
 * decoded by WHATWG URL); extra `decodeURIComponent` can corrupt secrets and
 * cause auth failures / connection resets.
 *
 * BullMQ: finite `maxRetriesPerRequest` for producers (HTTP handlers fail fast);
 * `null` for workers (blocking commands must retry).
 */
export function redisConnectionOptions(
  role: "producer" | "consumer"
): RedisOptions {
  const u = new URL(env.REDIS_URL);
  const isTls = u.protocol === "rediss:";
  return {
    host: u.hostname,
    port: Number(u.port) || 6379,
    username: u.username || undefined,
    password: u.password || undefined,
    ...(isTls ? { tls: {} } : {}),
    maxRetriesPerRequest: role === "consumer" ? null : 20,
    enableReadyCheck: false,
    // Prefer IPv4 — avoids intermittent ECONNRESET on some Windows / IPv6 routes
    family: 4
  };
}
