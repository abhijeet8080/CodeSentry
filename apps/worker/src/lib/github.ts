import type { Octokit } from "@octokit/rest";
import type { RestEndpointMethodTypes } from "@octokit/rest";

/**
 * Installation-scoped client from `@octokit/app` — structurally matches `Octokit["rest"]` usage.
 */
export type InstallationOctokit = { rest: Octokit["rest"] };

function parseRepo(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repoFullName: ${repoFullName}`);
  }
  return { owner, repo };
}

export async function getPRDetails(
  octokit: InstallationOctokit,
  repoFullName: string,
  prNumber: number
) {
  const { owner, repo } = parseRepo(repoFullName);

  const pr = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber
  });

  return pr.data;
}

export async function getPRFiles(
  octokit: InstallationOctokit,
  repoFullName: string,
  prNumber: number
) {
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

export async function listIssueComments(
  octokit: InstallationOctokit,
  repoFullName: string,
  prNumber: number
): Promise<string[]> {
  const { owner, repo } = parseRepo(repoFullName);

  const { data } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100
  });

  return data.map((c: { body?: string | null }) => c.body ?? "");
}

export async function postReview(
  octokit: InstallationOctokit,
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
