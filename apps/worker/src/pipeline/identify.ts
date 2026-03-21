import { openai } from "../lib/openai";
import type { ReviewChunk } from "../lib/chunker";
import { logger } from "@config/logger";

const issuesJsonSchema = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          severity: { type: "string" },
          line: { type: "number" },
          description: { type: "string" },
          suggestion: { type: "string" }
        },
        required: ["type", "severity", "line", "description", "suggestion"],
        additionalProperties: false
      }
    }
  },
  required: ["issues"],
  additionalProperties: false
} as const;

export type IssuesPayload = {
  issues: Array<{
    type: string;
    severity: string;
    line: number;
    description: string;
    suggestion: string; // required by strict schema; empty string means no suggestion
  }>;
};

export async function identifyIssues(
  chunk: ReviewChunk,
  summary: string
): Promise<IssuesPayload> {
  const systemPrompt = `You are a senior ${chunk.language} engineer. Identify real issues only.`;
  const userContent = `\nSummary:\n${summary}\n\nDiff:\n${chunk.patch}\n        `;

  logger.info(
    {
      model: "gpt-4.1-mini",
      file: chunk.filename,
      language: chunk.language,
      tokenCount: chunk.tokenCount,
      systemPrompt,
      diffPreview: chunk.patch.slice(0, 300) + (chunk.patch.length > 300 ? "…" : "")
    },
    "OpenAI request: identifyIssues"
  );

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    text: {
      format: {
        type: "json_schema",
        name: "issues",
        schema: issuesJsonSchema as unknown as { [key: string]: unknown },
        strict: true
      }
    },
    input: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userContent }
    ]
  });

  const parsed = JSON.parse(response.output_text) as IssuesPayload;

  logger.info(
    {
      file: chunk.filename,
      issueCount: parsed.issues.length,
      issues: parsed.issues
    },
    "OpenAI response: identifyIssues"
  );

  return parsed;
}
