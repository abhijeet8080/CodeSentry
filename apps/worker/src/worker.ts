import { Worker } from "bullmq";
import type { ReviewJob } from "@config/types";
import { redisConnectionOptions } from "@config/redis";
import { logger } from "@config/logger";

const worker = new Worker<ReviewJob>(
  "review-queue",
  async (job) => {
    logger.info(
      { jobId: job.id, name: job.name, data: job.data },
      "Processing review job"
    );
    // Placeholder for LLM / review logic
  },
  {
    connection: redisConnectionOptions("consumer")
  }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Review job completed");
});

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Review job failed");
});
