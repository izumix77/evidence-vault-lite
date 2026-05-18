import path from "node:path";

export const EV_LITE_DIR = ".ev-lite";
export const PACK_ID_PREFIX = "pack:";

export function packIdToBasename(packId: string): string {
  return packId.startsWith(PACK_ID_PREFIX)
    ? packId.slice(PACK_ID_PREFIX.length)
    : packId;
}

export function basenameToPackId(basename: string): string {
  return basename.startsWith(PACK_ID_PREFIX)
    ? basename
    : `${PACK_ID_PREFIX}${basename}`;
}

export function getRegistryPath(root: string): string {
  return path.join(root, EV_LITE_DIR, "registry.json");
}

export function getPackConfigPath(root: string, packId: string): string {
  return path.join(
    root,
    EV_LITE_DIR,
    "packs",
    `${packIdToBasename(packId)}.json`,
  );
}

export function getPackOutputPath(root: string, packId: string): string {
  return path.join(
    root,
    EV_LITE_DIR,
    "packs",
    `${packIdToBasename(packId)}.md`,
  );
}

export function getPacksDir(root: string): string {
  return path.join(root, EV_LITE_DIR, "packs");
}
