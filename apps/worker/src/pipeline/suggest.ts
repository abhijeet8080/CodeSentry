import { openai } from "../lib/openai";
import type { ReviewChunk } from "../lib/chunker";
import type { IssuesPayload } from "./identify";

type IssueRow = IssuesPayload["issues"][number];

export async function generateSuggestion(
  issue: IssueRow,
  chunk: ReviewChunk
): Promise<{ suggestion: string | null; tokens: number }> {
  if (!["bug", "security"].includes(issue.type)) {
    return { suggestion: null, tokens: 0 };
  }

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: "Provide a corrected code snippet."
      },
      {
        role: "user",
        content: `
Issue:
${issue.description}

Code:
${chunk.patch}
        `
      }
    ]
  });

  return {
    suggestion: `\`\`\`suggestion\n${response.output_text}\n\`\`\``,
    tokens: response.usage?.total_tokens ?? 0
  };
}
