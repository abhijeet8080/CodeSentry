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
  /** GitHub PAT (repo read) — used by worker for PR file fetches */
  GITHUB_TOKEN: process.env.GITHUB_TOKEN!
};