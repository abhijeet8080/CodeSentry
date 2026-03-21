import { Queue } from "bullmq";
import { redisConnectionOptions } from "@config/redis";
import { logger } from "@config/logger";

export const reviewQueue = new Queue("review-queue", {
  connection: redisConnectionOptions("producer")
});

// BullMQ emits "error" on the underlying ioredis client.
// Without this listener Node.js silently swallows the error and
// queue.add() calls may hang or fail without any visible log.
reviewQueue.on("error", (err) => {
  logger.error({ err }, "reviewQueue connection error");
});
