export function parsePatch(patch: string) {
  const lines = patch.split("\n");

  const addedLines: number[] = [];
  const removedLines: number[] = [];

  let currentLine = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = /@@ -\d+,\d+ \+(\d+),/.exec(line);
      if (match) {
        currentLine = parseInt(match[1], 10);
      }
      continue;
    }

    if (line.startsWith("+")) {
      addedLines.push(currentLine++);
    } else if (line.startsWith("-")) {
      removedLines.push(currentLine);
    } else {
      currentLine++;
    }
  }

  return { addedLines, removedLines };
}
