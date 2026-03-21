import crypto from "crypto";
import { env } from "@config/env";

export type VerifySignatureResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_secret" | "length_mismatch" | "mismatch";
    };

export function verifySignature(
  payload: string,
  signature: string
): VerifySignatureResult {
  const secret = env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: "missing_secret" };

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");

  const sigBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  if (sigBuffer.length !== digestBuffer.length) {
    return { ok: false, reason: "length_mismatch" };
  }

  if (!crypto.timingSafeEqual(sigBuffer, digestBuffer)) {
    return { ok: false, reason: "mismatch" };
  }

  return { ok: true };
}