import fg from "fast-glob";
import { parseFile } from "./parse.js";
import { buildRegistry, type Registry } from "./registry.js";

const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/.ev-lite/packs/**",
  "**/.ev-lite/registry.json",
];

export async function scanFiles(root: string): Promise<string[]> {
  const visible = await fg("**/*.md", {
    cwd: root,
    ignore: DEFAULT_IGNORE,
    onlyFiles: true,
    dot: false,
  });
  const snapshots = await fg(".ev-lite/snapshots/**/*.md", {
    cwd: root,
    onlyFiles: true,
    dot: true,
  });
  return [...new Set([...visible, ...snapshots])].sort();
}

export async function scanRepo(root: string): Promise<Registry> {
  const files = await scanFiles(root);
  const nodes = await Promise.all(files.map((f) => parseFile(root, f)));
  return buildRegistry(root, nodes);
}
