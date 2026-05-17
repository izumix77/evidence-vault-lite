import fg from "fast-glob";

const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/.ev-lite/**",
];

export async function scanFiles(root: string): Promise<string[]> {
  const files = await fg("**/*.md", {
    cwd: root,
    ignore: DEFAULT_IGNORE,
    onlyFiles: true,
    dot: false,
  });
  return files.sort();
}
