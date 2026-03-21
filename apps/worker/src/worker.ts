import { Worker } from "bullmq";
import type { ReviewJob } from "@config/types";
import { redisConnectionOptions } from "@config/redis";
import { logger } from "@config/logger";
import { getPRFiles } from "./lib/github";
import { buildChunks } from "./lib/chunker";

const worker = new Worker<ReviewJob>(
  "review-queue",
  async (job) => {
    const { prNumber, repoFullName, deliveryId } = job.data;

    logger.info(
      { jobId: job.id, name: job.name, deliveryId, prNumber, repoFullName },
      "Processing review job"
    );

    logger.info({ deliveryId, prNumber, repoFullName }, "Fetching PR files");

    const files = await getPRFiles(repoFullName, prNumber);

    logger.info(
      { deliveryId, fileCount: files.length },
      `Files fetched: ${files.length}`
    );

    const chunks = buildChunks(files);

    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);

    logger.info(
      { deliveryId, chunkCount: chunks.length, totalTokens },
      `Chunks created: ${chunks.length}, total tokens: ${totalTokens}`
    );
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

// Without this listener, ioredis connection errors are silently swallowed
// and the worker stops dequeuing new jobs with no visible output.
worker.on("error", (err) => {
  logger.error({ err }, "Worker connection error");
});
