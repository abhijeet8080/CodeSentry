import { Octokit } from "@octokit/rest";
import type { RestEndpointMethodTypes } from "@octokit/rest";
import { env } from "@config/env";

export const octokit = new Octokit({
  auth: env.GITHUB_TOKEN
});

function parseRepo(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repoFullName: ${repoFullName}`);
  }
  return { owner, repo };
}

export async function getPRDetails(repoFullName: string, prNumber: number) {
  const { owner, repo } = parseRepo(repoFullName);

  const pr = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber
  });

  return pr.data;
}

export async function getPRFiles(repoFullName: string, prNumber: number) {
  const { owner, repo } = parseRepo(repoFullName);

  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100
  });

  return data;
}

export type PullReviewComment =
  NonNullable<
    RestEndpointMethodTypes["pulls"]["createReview"]["parameters"]["comments"]
  >[number];

export async function postReview(
  repoFullName: string,
  prNumber: number,
  comments: PullReviewComment[],
  commitId: string
) {
  const { owner, repo } = parseRepo(repoFullName);

  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: "COMMENT",
    commit_id: commitId,
    comments,
    body: "_Automated review (Bugbot)._"
  });
}
