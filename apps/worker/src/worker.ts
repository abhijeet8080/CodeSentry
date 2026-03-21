import { Worker } from "bullmq";
import type { ReviewJob } from "@config/types";
import { redisConnectionOptions } from "@config/redis";
import { logger } from "@config/logger";
import {
  getPRDetails,
  getPRFiles,
  postReview
} from "./lib/github";
import { buildReviewComments } from "./lib/comments";
import { buildChunks } from "./lib/chunker";
import { processChunks } from "./workers/review";

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

    const issues = await processChunks(chunks);

    logger.info(
      { deliveryId, issueCount: issues.length },
      `Issues found: ${issues.length}`
    );

    if (issues.length > 0) {
      const prDetails = await getPRDetails(repoFullName, prNumber);
      const commitId = prDetails.head.sha;
      const reviewComments = buildReviewComments(issues);

      await postReview(repoFullName, prNumber, reviewComments, commitId);

      logger.info({ deliveryId, prNumber, repoFullName }, "Review posted");
    }
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
