import { openai } from "../lib/openai";
import type { ReviewChunk } from "../lib/chunker";

export async function summarizeChunk(chunk: ReviewChunk) {
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: "You are a senior software engineer."
      },
      {
        role: "user",
        content: `Summarize what changed in this code diff:\n\n${chunk.patch}`
      }
    ]
  });

  return response.output_text;
}
