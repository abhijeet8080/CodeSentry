import type { ReviewIssueResult } from "../workers/review";
import { logger } from "@config/logger";

/**
 * Snaps an AI-returned line number to the nearest valid line in the diff.
 *
 * GitHub's review API only accepts line numbers that appear in the diff hunk
 * (`addedLines`). The AI returns absolute file line numbers which may be
 * outside the hunk, causing a 422 "Line could not be resolved" error.
 */
function snapToNearestDiffLine(line: number, addedLines: number[]): number {
  if (addedLines.length === 0) return line;

  // If the line is directly in the diff, use it as-is
  if (addedLines.includes(line)) return line;

  // Otherwise pick the closest added line
  return addedLines.reduce((best, candidate) =>
    Math.abs(candidate - line) < Math.abs(best - line) ? candidate : best
  );
}

export function buildReviewComments(issues: ReviewIssueResult[]) {
  return issues.map((issue) => {
    const snappedLine = snapToNearestDiffLine(issue.line, issue.addedLines);

    if (snappedLine !== issue.line) {
      logger.warn(
        {
          file: issue.filename,
          aiLine: issue.line,
          snappedLine,
          validLines: issue.addedLines
        },
        "Line snapped to nearest diff line"
      );
    }

    return {
      path: issue.filename,
      body: formatComment(issue),
      line: snappedLine,
      side: "RIGHT" as const
    };
  });
}

function formatComment(issue: ReviewIssueResult) {
  return `
### ${issue.type.toUpperCase()} (${issue.severity})

${issue.description}

${issue.suggestion ?? ""}
`;
}
