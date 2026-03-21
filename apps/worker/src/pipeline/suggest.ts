import { openai } from "../lib/openai";
import type { ReviewChunk } from "../lib/chunker";
import type { IssuesPayload } from "./identify";

type IssueRow = IssuesPayload["issues"][number];

export async function generateSuggestion(
  issue: IssueRow,
  chunk: ReviewChunk
): Promise<string | null> {
  if (!["bug", "security"].includes(issue.type)) return null;

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

  return `\`\`\`suggestion\n${response.output_text}\n\`\`\``;
}
