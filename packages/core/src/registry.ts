import path from "node:path";
import fs from "fs-extra";
import type { EvidenceNode } from "@ev-lite/shared";

export type Registry = {
  generated_at: string;
  root: string;
  nodes: EvidenceNode[];
};

export function buildRegistry(
  root: string,
  nodes: EvidenceNode[],
): Registry {
  return {
    generated_at: new Date().toISOString(),
    root,
    nodes,
  };
}

export async function saveRegistry(
  outputPath: string,
  registry: Registry,
): Promise<void> {
  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeJson(outputPath, registry, { spaces: 2 });
}

export async function loadRegistry(outputPath: string): Promise<Registry> {
  const data = (await fs.readJson(outputPath)) as Registry;
  return data;
}
