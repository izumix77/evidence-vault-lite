import fg from "fast-glob";
import { parseFile } from "./parse.js";
import { buildRegistry, type Registry } from "./registry.js";
import { deriveTags } from "./deriveTags.js";
import { listPackIds, readPackConfig } from "./packs.js";
import { readMarkdownFile } from "./files.js";
import type { EvidenceNode } from "@ev-lite/shared";

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

  // Aggregate references across nodes + pack configs to populate importance.
  const { refCounts, packDepCounts } = await aggregateReferences(root, nodes);

  for (const n of nodes) {
    if (n.ev_id === null) continue;
    const existing = n.importance ?? {};
    n.importance = {
      ...existing,
      reference_count: refCounts.get(n.ev_id) ?? 0,
      pack_dependency_count: packDepCounts.get(n.ev_id) ?? 0,
    };
  }

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

async function aggregateReferences(
  root: string,
  nodes: EvidenceNode[],
): Promise<{
  refCounts: Map<string, number>;
  packDepCounts: Map<string, number>;
}> {
  const refCounts = new Map<string, number>();
  const packDepCounts = new Map<string, number>();

  const bump = (map: Map<string, number>, id: unknown) => {
    if (typeof id !== "string" || !id) return;
    map.set(id, (map.get(id) ?? 0) + 1);
  };

  // Node-level references. depends_on already contains handover.must_read
  // because parseFile merges it for type: handover.
  for (const n of nodes) {
    for (const id of n.depends_on) bump(refCounts, id);
    for (const id of n.related) bump(refCounts, id);
    for (const id of n.supersedes) bump(refCounts, id);

    // Handover optional_read is not folded into depends_on — pick it up here.
    if (n.ev_id !== null && n.ev_id.startsWith("ev:handover.")) {
      try {
        const payload = await readMarkdownFile(root, n.path);
        const optional = payload.frontmatter.optional_read;
        if (Array.isArray(optional)) {
          for (const v of optional) bump(refCounts, v);
        }
      } catch {
        // silent skip — unreadable handover file shouldn't fail the scan
      }
    }
  }

  // Pack-level references — pack.json mustRead drives pack_dependency_count;
  // both mustRead and related contribute to reference_count.
  let packIds: string[] = [];
  try {
    packIds = await listPackIds(root);
  } catch {
    packIds = [];
  }
  for (const pid of packIds) {
    try {
      const pack = await readPackConfig(root, pid);
      for (const id of pack.mustRead) {
        bump(refCounts, id);
        bump(packDepCounts, id);
      }
      if (pack.related) {
        for (const id of pack.related) bump(refCounts, id);
      }
    } catch {
      // silent skip per spec — malformed pack.json shouldn't fail the scan
    }
  }

  return { refCounts, packDepCounts };
}
