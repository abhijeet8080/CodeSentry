import { logger } from "@config/logger";
import { summarizeChunk } from "../pipeline/summarize";
import { identifyIssues } from "../pipeline/identify";
import { generateSuggestion } from "../pipeline/suggest";
import type { ReviewChunk } from "../lib/chunker";

export type ReviewIssueResult = {
  type: string;
  severity: string;
  line: number;
  description: string;
  suggestion: string | null;
  filename: string;
};

export async function processChunks(
  chunks: ReviewChunk[]
): Promise<ReviewIssueResult[]> {
  const results: ReviewIssueResult[] = [];

  for (const chunk of chunks) {
    try {
      const summary = await summarizeChunk(chunk);

      const issuesData = await identifyIssues(chunk, summary);

      for (const issue of issuesData.issues) {
        const suggestion = await generateSuggestion(issue, chunk);

        results.push({
          ...issue,
          suggestion,
          filename: chunk.filename
        });
      }
    } catch (err) {
      logger.error({ err }, "Chunk review failed");
    }
  }

  return results;
}
