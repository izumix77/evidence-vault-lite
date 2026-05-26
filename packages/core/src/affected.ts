import path from "node:path";
import fs from "fs-extra";
import matter from "gray-matter";
import type { EvidenceNode } from "@ev-lite/shared";
import { loadRegistry } from "./registry.js";
import { listPackIds, readPackConfig } from "./packs.js";
import { getPackConfigPath, getRegistryPath } from "./paths.js";

export interface AffectedSnapshot {
  evId: string;
  path: string;
}

export interface AffectedPack {
  packId: string;
  path: string;
  viaEvId: string;
}

export interface AffectedResult {
  file: string;
  affectedSnapshots: AffectedSnapshot[];
  affectedPacks: AffectedPack[];
  summary: {
    snapshotCount: number;
    packCount: number;
  };
}

function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

async function resolveByOptionalField(
  node: Record<string, unknown>,
  field: string,
  root: string,
): Promise<string | null> {
  const value = node[field];
  if (typeof value !== "string" || !value) return null;
  const candidate = path.resolve(root, value);
  return (await fs.pathExists(candidate)) ? candidate : null;
}

async function fallbackSearchByEvId(
  evId: string,
  root: string,
): Promise<string | null> {
  const snapshotsDir = path.join(root, ".ev-lite", "snapshots");
  if (!(await fs.pathExists(snapshotsDir))) return null;
  const entries = await fs.readdir(snapshotsDir);
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const full = path.join(snapshotsDir, entry);
    const raw = await fs.readFile(full, "utf8");
    const parsed = matter(raw);
    if (parsed.data.ev_id === evId) return full;
  }
  return null;
}

async function resolveSnapshotPath(
  node: EvidenceNode,
  root: string,
): Promise<string | null> {
  const bag = node as unknown as Record<string, unknown>;
  return (
    (await resolveByOptionalField(bag, "path", root)) ??
    (await resolveByOptionalField(bag, "filePath", root)) ??
    (await resolveByOptionalField(bag, "source", root)) ??
    (node.ev_id ? await fallbackSearchByEvId(node.ev_id, root) : null)
  );
}

export async function findAffected(
  file: string,
  root: string,
): Promise<AffectedResult> {
  const normalizedFile = toPosix(file);

  const registry = await loadRegistry(getRegistryPath(root));

  const snapshotNodes = registry.nodes.filter(
    (n) => Array.isArray(n.tags) && n.tags.includes("snapshot"),
  );

  const affectedSnapshots: AffectedSnapshot[] = [];
  for (const node of snapshotNodes) {
    if (!node.ev_id) continue;
    const snapshotPath = await resolveSnapshotPath(node, root);
    if (!snapshotPath) continue;

    const content = await fs.readFile(snapshotPath, "utf8");
    if (content.includes(normalizedFile)) {
      affectedSnapshots.push({
        evId: node.ev_id,
        path: toPosix(path.relative(root, snapshotPath)),
      });
    }
  }

  const affectedEvIds = affectedSnapshots.map((s) => s.evId);
  const affectedPacks: AffectedPack[] = [];

  if (affectedEvIds.length > 0) {
    const packIds = await listPackIds(root);
    for (const packId of packIds) {
      let pack;
      try {
        pack = await readPackConfig(root, packId);
      } catch {
        continue;
      }
      const matched = affectedEvIds.find((evId) =>
        pack.mustRead.includes(evId),
      );
      if (matched) {
        affectedPacks.push({
          packId,
          path: toPosix(path.relative(root, getPackConfigPath(root, packId))),
          viaEvId: matched,
        });
      }
    }
  }

  return {
    file: normalizedFile,
    affectedSnapshots,
    affectedPacks,
    summary: {
      snapshotCount: affectedSnapshots.length,
      packCount: affectedPacks.length,
    },
  };
}
