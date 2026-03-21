import type { RestEndpointMethodTypes } from "@octokit/rest";
import { parsePatch } from "./parser";
import {
  MAX_FILE_CHANGES,
  MAX_TOKENS_PER_CHUNK,
  MAX_TOTAL_TOKENS
} from "./constants";

type PullListFile =
  RestEndpointMethodTypes["pulls"]["listFiles"]["response"]["data"][number];

function getLanguage(filename: string) {
  if (filename.endsWith(".ts") || filename.endsWith(".tsx")) return "typescript";
  if (filename.endsWith(".js") || filename.endsWith(".jsx")) return "javascript";
  if (filename.endsWith(".py")) return "python";
  return "unknown";
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function shouldSkipFile(filename: string) {
  return (
    filename.includes("package-lock.json") ||
    filename.includes("yarn.lock") ||
    filename.includes("pnpm-lock.yaml") ||
    filename.startsWith("dist/") ||
    filename.startsWith("build/") ||
    filename.includes(".min.")
  );
}

function splitPatch(patch: string, maxTokens: number) {
  const lines = patch.split("\n");
  const chunks: string[] = [];

  let current: string[] = [];
  let currentTokens = 0;

  for (const line of lines) {
    const lineTokens = estimateTokens(line);

    if (currentTokens + lineTokens > maxTokens) {
      if (current.length) {
        chunks.push(current.join("\n"));
      }
      current = [];
      currentTokens = 0;
    }

    current.push(line);
    currentTokens += lineTokens;
  }

  if (current.length) {
    chunks.push(current.join("\n"));
  }

  return chunks;
}

export function buildChunks(files: PullListFile[]) {
  const chunks: Array<{
    filename: string;
    patch: string;
    addedLines: number[];
    language: string;
    tokenCount: number;
  }> = [];

  let totalTokens = 0;

  outer: for (const file of files) {
    if (!file.patch) continue;
    if (!file.patch.includes("+")) continue;
    if (shouldSkipFile(file.filename)) continue;

    const changes = file.changes ?? 0;
    if (changes > MAX_FILE_CHANGES) continue;

    const tokenCount = estimateTokens(file.patch);

    const patches =
      tokenCount > MAX_TOKENS_PER_CHUNK
        ? splitPatch(file.patch, MAX_TOKENS_PER_CHUNK)
        : [file.patch];

    for (const patchPart of patches) {
      const chunkTokens = estimateTokens(patchPart);

      if (totalTokens + chunkTokens > MAX_TOTAL_TOKENS) {
        break outer;
      }

      const { addedLines } = parsePatch(patchPart);

      chunks.push({
        filename: file.filename,
        patch: patchPart,
        addedLines,
        language: getLanguage(file.filename),
        tokenCount: chunkTokens
      });

      totalTokens += chunkTokens;
    }
  }

  return chunks;
}
