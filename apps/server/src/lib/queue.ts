import { Queue } from "bullmq";
import { redisConnectionOptions } from "@config/redis";

export const reviewQueue = new Queue("review-queue", {
  connection: redisConnectionOptions("producer")
});
