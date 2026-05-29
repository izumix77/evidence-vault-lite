import fg from "fast-glob";
import { parseFile } from "./parse.js";
import { buildRegistry, type Registry } from "./registry.js";
import { deriveTags } from "./deriveTags.js";

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

  // Derived tags are computed at registry build time and never written back
  // to frontmatter (kernel neutrality). SUPERSEDED is also assigned when any
  // other node lists this ev_id in its supersedes array.
  const supersededIds = new Set<string>();
  for (const n of nodes) {
    for (const target of n.supersedes) supersededIds.add(target);
  }
  const now = new Date();
  for (const n of nodes) {
    const effectivelySuperseded =
      n.ev_id !== null && supersededIds.has(n.ev_id);
    n.derived_tags = deriveTags(n, { effectivelySuperseded, now });
  }

  return buildRegistry(root, nodes);
}
