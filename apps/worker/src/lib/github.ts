import type { Octokit } from "@octokit/rest";
import type { RestEndpointMethodTypes } from "@octokit/rest";

/**
 * Installation-scoped client from `@octokit/app` — structurally matches `Octokit["rest"]` usage.
 */
export type InstallationOctokit = { rest: Octokit["rest"] };

type PullsApi = Octokit["rest"]["pulls"];
type IssuesApi = Octokit["rest"]["issues"];

function getRestLikeApi(octokit: InstallationOctokit): Octokit["rest"] {
  const maybeWithRest = octokit as unknown as { rest?: Octokit["rest"] };
  if (maybeWithRest?.rest) {
    return maybeWithRest.rest;
  }
  // Some Octokit instances expose route groups directly on the client object.
  return octokit as unknown as Octokit["rest"];
}

function getPullsApi(octokit: InstallationOctokit): PullsApi {
  const pulls = getRestLikeApi(octokit)?.pulls;
  if (!pulls) {
    throw new Error(
      "GitHub client is missing pulls API. Ensure installation auth is configured and Octokit instance is valid."
    );
  }
  return pulls;
}

function getIssuesApi(octokit: InstallationOctokit): IssuesApi {
  const issues = getRestLikeApi(octokit)?.issues;
  if (!issues) {
    throw new Error(
      "GitHub client is missing issues API. Ensure installation auth is configured and Octokit instance is valid."
    );
  }
  return issues;
}

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
  const pulls = getPullsApi(octokit);

  const pr = await pulls.get({
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
  const pulls = getPullsApi(octokit);

  const { data } = await pulls.listFiles({
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
  const issues = getIssuesApi(octokit);

  const { data } = await issues.listComments({
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
  const pulls = getPullsApi(octokit);

  await pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: "COMMENT",
    commit_id: commitId,
    comments,
    body: "_Automated review (Bugbot)._"
  });
}
