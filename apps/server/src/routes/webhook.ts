import { Hono } from "hono";
import { Prisma } from "@prisma/client";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { verifySignature } from "../lib/hmac";
import { prisma } from "../lib/db";
import { reviewQueue } from "../lib/queue";
const webhook = new Hono();

webhook.post("/github", async (c) => {
  const signature = c.req.header("x-hub-signature-256");
  const event = c.req.header("x-github-event");
  const deliveryId = c.req.header("x-github-delivery");
  const hookId = c.req.header("x-github-hook-id");

  try {
    logger.info(
      {
        deliveryId: deliveryId ?? null,
        event: event ?? null,
        hookId: hookId ?? null,
        contentType: c.req.header("content-type") ?? null,
        userAgent: c.req.header("user-agent")?.slice(0, 120) ?? null
      },
      "GitHub webhook: incoming request"
    );

    if (!signature || !event || !deliveryId) {
      logger.warn(
        {
          hasSignature: Boolean(signature),
          hasEvent: Boolean(event),
          hasDeliveryId: Boolean(deliveryId)
        },
        "GitHub webhook missing required headers"
      );
      return c.text("Missing headers", 400);
    }

    // IMPORTANT: get raw body (signature must be verified over raw payload)
    const rawBody = await c.req.text();
    const rawBodyBytes = Buffer.byteLength(rawBody, "utf8");

    logger.info(
      { deliveryId, event, hookId, rawBodyBytes },
      "GitHub webhook: raw body read"
    );

    const verification = verifySignature(rawBody, signature);
    if (!verification.ok) {
      logger.warn(
        {
          deliveryId,
          event,
          verifyReason: verification.reason,
          hasWebhookSecret: Boolean(env.GITHUB_WEBHOOK_SECRET?.trim()),
          webhookSecretLength: env.GITHUB_WEBHOOK_SECRET?.length ?? 0,
          signatureLength: signature.length,
          signaturePrefix: signature.slice(0, 7),
          rawBodyBytes
        },
        "GitHub webhook signature verification failed"
      );
      return c.text("Invalid signature", 401);
    }

    logger.info({ deliveryId, event, hookId }, "GitHub webhook: signature valid");

    let payload: Prisma.InputJsonValue;
    try {
      payload = JSON.parse(rawBody) as Prisma.InputJsonValue;
    } catch (parseErr) {
      logger.warn(
        { deliveryId, event, rawBodyBytes, err: parseErr },
        "GitHub webhook: JSON parse failed"
      );
      return c.text("Invalid JSON", 400);
    }

    // Filter events
    if (event !== "pull_request") {
      logger.info(
        { deliveryId, event, hookId },
        "GitHub webhook: ignored (not pull_request)"
      );
      return c.text("Ignored", 200);
    }

    const p = payload as Record<string, unknown>;
    const action =
      typeof p?.action === "string" ? p.action : undefined;
    const repo = p.repository as { full_name?: unknown } | undefined;
    const repoFullName =
      typeof repo?.full_name === "string" ? repo.full_name : undefined;
    const pr = p.pull_request as { number?: unknown } | undefined;
    const prNumber =
      typeof pr?.number === "number" ? pr.number : undefined;

    if (!["opened", "synchronize"].includes(action ?? "")) {
      logger.info(
        {
          deliveryId,
          event,
          hookId,
          action: action ?? null,
          repoFullName: repoFullName ?? null,
          prNumber: prNumber ?? null
        },
        "GitHub webhook: ignored (PR action not handled)"
      );
      return c.text("Ignored", 200);
    }

    logger.info(
      {
        deliveryId,
        event,
        hookId,
        action,
        repoFullName: repoFullName ?? null,
        prNumber: prNumber ?? null
      },
      "GitHub webhook: handling PR event"
    );

    // Idempotency: create is atomic; if we race, unique constraint will throw.
    // TODO: re-enable once queue processing is verified end-to-end
    // try {
    //   const record = await prisma.webhookEvent.create({
    //     data: {
    //       deliveryId,
    //       payload,
    //     },
    //   });
    //   logger.info(
    //     {
    //       deliveryId,
    //       webhookEventId: record.id,
    //       action,
    //       repoFullName: repoFullName ?? null,
    //       prNumber: prNumber ?? null
    //     },
    //     "GitHub webhook: stored, accepted"
    //   );
    // } catch (err) {
    //   if (
    //     err instanceof Prisma.PrismaClientKnownRequestError &&
    //     err.code === "P2002"
    //   ) {
    //     logger.info(
    //       { deliveryId, action, repoFullName: repoFullName ?? null },
    //       "GitHub webhook: duplicate delivery id, idempotent ok"
    //     );
    //     return c.text("Duplicate", 200);
    //   }
    //   throw err;
    // }

      if (typeof repoFullName !== "string" || typeof prNumber !== "number") {
        logger.warn(
          { deliveryId, repoFullName, prNumber },
          "GitHub webhook: missing PR fields, skip queue"
        );
        return c.text("Accepted", 202);
      }

      await reviewQueue.add(
        "review-pr",
        {
          prNumber,
          repoFullName,
          deliveryId
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000
          }
        }
      );

      logger.info(
        { deliveryId, prNumber, repoFullName },
        "Job added to queue"
      );

    return c.text("Accepted", 202);
  } catch (err) {
    logger.error({ err, deliveryId, event }, "Webhook handler error");
    return c.text("Internal error", 500);
  }
});

export default webhook;