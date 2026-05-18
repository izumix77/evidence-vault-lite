import path from "node:path";
import fs from "fs-extra";
import fg from "fast-glob";
import { ContextPackSchema, type ContextPack } from "@ev-lite/shared";
import { basenameToPackId, getPackConfigPath, getPacksDir } from "./paths.js";

export async function listPackIds(root: string): Promise<string[]> {
  const dir = getPacksDir(root);
  if (!(await fs.pathExists(dir))) return [];
  const files = await fg("*.json", { cwd: dir, onlyFiles: true });
  return files
    .map((f) => basenameToPackId(path.basename(f, ".json")))
    .sort();
}

export async function readPackConfig(
  root: string,
  packId: string,
): Promise<ContextPack> {
  const filepath = getPackConfigPath(root, packId);
  const raw = await fs.readJson(filepath);
  return ContextPackSchema.parse(raw);
}

export async function writePackConfig(
  root: string,
  packId: string,
  pack: ContextPack,
): Promise<void> {
  const validated = ContextPackSchema.parse(pack);
  const filepath = getPackConfigPath(root, packId);
  await fs.ensureDir(path.dirname(filepath));
  await fs.writeJson(filepath, validated, { spaces: 2 });
}
