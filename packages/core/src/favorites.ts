import path from "node:path";
import fs from "fs-extra";
import { getFavoritesPath } from "./paths.js";

export async function readFavorites(root: string): Promise<string[]> {
  const filepath = getFavoritesPath(root);
  if (!(await fs.pathExists(filepath))) return [];
  try {
    const data = await fs.readJson(filepath);
    if (!Array.isArray(data)) return [];
    return data.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export async function writeFavorites(
  root: string,
  favorites: string[],
): Promise<void> {
  const filepath = getFavoritesPath(root);
  await fs.ensureDir(path.dirname(filepath));
  await fs.writeJson(filepath, favorites, { spaces: 2 });
}

export async function addFavorite(
  root: string,
  value: string,
): Promise<string[]> {
  const current = await readFavorites(root);
  if (current.includes(value)) return current;
  const next = [...current, value];
  await writeFavorites(root, next);
  return next;
}

export async function deleteFavoriteAt(
  root: string,
  index: number,
): Promise<string[]> {
  const current = await readFavorites(root);
  if (index < 0 || index >= current.length) return current;
  const next = current.filter((_, i) => i !== index);
  await writeFavorites(root, next);
  return next;
}
