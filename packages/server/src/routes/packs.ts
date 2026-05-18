import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import type { Hono } from "hono";
import {
  listPackIds,
  readPackConfig,
  writePackConfig,
  deletePackFiles,
  buildPack,
  loadRegistry,
  ContextPackSchema,
  getPackOutputPath,
  getRegistryPath,
} from "@ev-lite/core";

export function registerPacksRoutes(
  app: Hono,
  opts: { root: string },
): void {
  app.get("/api/packs", async (c) => {
    const ids = await listPackIds(opts.root);
    return c.json(ids);
  });

  app.get("/api/packs/:id", async (c) => {
    const id = c.req.param("id");
    const pack = await readPackConfig(opts.root, id);
    return c.json(pack);
  });

  app.put("/api/packs/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const pack = ContextPackSchema.parse(body);
    await writePackConfig(opts.root, id, pack);
    return c.json({ ok: true });
  });

  app.delete("/api/packs/:id", async (c) => {
    const id = c.req.param("id");
    await deletePackFiles(opts.root, id);
    return c.json({ ok: true });
  });

  app.post("/api/packs/:id/build", async (c) => {
    const id = c.req.param("id");
    const pack = await readPackConfig(opts.root, id);
    const registry = await loadRegistry(getRegistryPath(opts.root));
    const md = await buildPack(pack, registry, opts.root);
    const outputPath = getPackOutputPath(opts.root, id);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, md, "utf8");
    return c.text(md);
  });
}
