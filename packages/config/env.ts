import path from "path";
import dotenv from "dotenv";

// Load the repo root `.env` deterministically (independent of process CWD).
dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET!,
  /** GitHub App — worker uses installation token via @octokit/app */
  GITHUB_APP_ID: process.env.GITHUB_APP_ID!,
  /** PEM private key (use \\n in .env for newlines, or real newlines) */
  GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY!
};