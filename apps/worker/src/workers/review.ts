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
  addedLines: number[];
};

export async function processChunks(chunks: ReviewChunk[]): Promise<{
  issues: ReviewIssueResult[];
  llmTokensUsed: number;
}> {
  const results: ReviewIssueResult[] = [];
  let llmTokensUsed = 0;

  for (const chunk of chunks) {
    try {
      const { summary, tokens: summarizeTokens } = await summarizeChunk(chunk);
      llmTokensUsed += summarizeTokens;

      const { data: issuesPayload, tokens: identifyTokens } =
        await identifyIssues(chunk, summary);
      llmTokensUsed += identifyTokens;

      for (const issue of issuesPayload.issues) {
        const { suggestion, tokens: suggestTokens } = await generateSuggestion(
          issue,
          chunk
        );
        llmTokensUsed += suggestTokens;

        results.push({
          ...issue,
          suggestion,
          filename: chunk.filename,
          addedLines: chunk.addedLines
        });
      }
    } catch (err) {
      logger.error({ err }, "Chunk review failed");
    }
  }

  return { issues: results, llmTokensUsed };
}
