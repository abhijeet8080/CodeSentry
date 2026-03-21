import { Octokit } from "@octokit/rest";
import { env } from "@config/env";

export const octokit = new Octokit({
  auth: env.GITHUB_TOKEN
});

export async function getPRFiles(repoFullName: string, prNumber: number) {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repoFullName: ${repoFullName}`);
  }

  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100
  });

  return data;
}
