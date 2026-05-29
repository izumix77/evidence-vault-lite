import path from "node:path";
import { promises as fs } from "node:fs";
import type { Hono } from "hono";

export type DirEntry = {
  name: string;
  path: string;
  hasChildren: boolean;
  fileCount: number;
};

const EXTRA_BLOCKED = new Set(["node_modules", "dist"]);

function isHidden(name: string): boolean {
  return name.startsWith(".") || EXTRA_BLOCKED.has(name);
}

function isInsideRoot(rootAbs: string, targetAbs: string): boolean {
  const rel = path.relative(rootAbs, targetAbs);
  if (rel === "") return true;
  if (rel.startsWith("..")) return false;
  if (path.isAbsolute(rel)) return false;
  return true;
}

async function countChildren(
  absDir: string,
): Promise<{ hasChildren: boolean; fileCount: number }> {
  let hasChildren = false;
  let fileCount = 0;
  try {
    const entries = await fs.readdir(absDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && !isHidden(e.name)) hasChildren = true;
      else if (e.isFile() && e.name.endsWith(".md")) fileCount++;
    }
  } catch {
    // unreadable subdir: report nothing
  }
  return { hasChildren, fileCount };
}

export function registerDirsRoutes(
  app: Hono,
  opts: { root: string },
): void {
  app.get("/api/dirs", async (c) => {
    const relRaw = c.req.query("path") ?? "";
    const rootAbs = path.resolve(opts.root);
    const targetAbs = path.resolve(rootAbs, relRaw);

    if (!isInsideRoot(rootAbs, targetAbs)) {
      return c.json({ error: "Path traversal denied" }, 400);
    }

    let stat;
    try {
      stat = await fs.stat(targetAbs);
    } catch {
      return c.json({ error: "Directory not found" }, 404);
    }
    if (!stat.isDirectory()) {
      return c.json({ error: "Not a directory" }, 400);
    }

    let entries;
    try {
      entries = await fs.readdir(targetAbs, { withFileTypes: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `readdir failed: ${msg}` }, 500);
    }

    const dirs: DirEntry[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (isHidden(e.name)) continue;
      const childAbs = path.join(targetAbs, e.name);
      const childRel = path
        .relative(rootAbs, childAbs)
        .replace(/\\/g, "/");
      const { hasChildren, fileCount } = await countChildren(childAbs);
      dirs.push({ name: e.name, path: childRel, hasChildren, fileCount });
    }
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    return c.json(dirs);
  });
}
