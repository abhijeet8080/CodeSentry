import { Worker } from "bullmq";
import type { ReviewJob } from "@config/types";
import { redisConnectionOptions } from "@config/redis";
import { logger } from "@config/logger";
import { prisma } from "./lib/db";
import { getInstallationClient } from "./lib/github-app";
import {
  type InstallationOctokit,
  getPRDetails,
  getPRFiles,
  listIssueComments,
  postReview
} from "./lib/github";
import {
  buildReviewComments,
  filterIssuesNotYetPosted
} from "./lib/comments";
import { buildChunks } from "./lib/chunker";
import { processChunks } from "./workers/review";

const worker = new Worker<ReviewJob>(
  "review-queue",
  async (job) => {
    const { prNumber, repoFullName, deliveryId, installationId } = job.data;

    if (typeof installationId !== "number") {
      throw new Error("Missing installationId on review job");
    }

    const octokit = (await getInstallationClient(installationId)) as unknown as InstallationOctokit;

    logger.info(
      {
        jobId: job.id,
        name: job.name,
        deliveryId,
        prNumber,
        repoFullName,
        installationId
      },
      "Processing PR"
    );

    const reviewJob = await prisma.reviewJob.upsert({
      where: { deliveryId },
      create: {
        deliveryId,
        prNumber,
        repoFullName,
        status: "processing"
      },
      update: {
        status: "processing",
        error: null,
        issueCount: null,
        tokenUsed: null
      }
    });

    try {
      logger.info({ deliveryId, prNumber, repoFullName }, "Fetching PR files");

      const files = await getPRFiles(octokit, repoFullName, prNumber);

      logger.info(
        { deliveryId, fileCount: files.length },
        `Files fetched: ${files.length}`
      );

      const chunks = buildChunks(files);

      const chunkEstimateTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);

      logger.info(
        {
          deliveryId,
          chunkCount: chunks.length,
          chunkEstimateTokens
        },
        `Chunks created: ${chunks.length}, estimated chunk tokens: ${chunkEstimateTokens}`
      );

      const { issues, llmTokensUsed } = await processChunks(chunks);

      logger.info(
        { deliveryId, issueCount: issues.length, llmTokensUsed },
        `Issues found: ${issues.length}`
      );

      if (issues.length > 0) {
        const existingBodies = await listIssueComments(
          octokit,
          repoFullName,
          prNumber
        );
        const toPost = filterIssuesNotYetPosted(issues, existingBodies);

        if (toPost.length > 0) {
          const prDetails = await getPRDetails(octokit, repoFullName, prNumber);
          const commitId = prDetails.head.sha;
          const reviewComments = buildReviewComments(toPost);

          await postReview(
            octokit,
            repoFullName,
            prNumber,
            reviewComments,
            commitId
          );

          logger.info(
            { deliveryId, prNumber, repoFullName, postedCount: toPost.length },
            "Review posted"
          );
        } else {
          logger.info(
            { deliveryId, prNumber },
            "All issues already present on PR; skipping comment post"
          );
        }
      }

      await prisma.reviewJob.update({
        where: { id: reviewJob.id },
        data: {
          status: "completed",
          issueCount: issues.length,
          tokenUsed: llmTokensUsed
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.reviewJob.update({
        where: { id: reviewJob.id },
        data: {
          status: "failed",
          error: message
        }
      });
      throw err;
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
  logger.error({ jobId: job?.id, err }, "Job failed");
});

worker.on("error", (err) => {
  logger.error({ err }, "Worker connection error");
});
