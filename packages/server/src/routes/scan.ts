import type { Hono } from "hono";
import { scanRepo, saveRegistry, getRegistryPath } from "@ev-lite/core";

export function registerScanRoutes(
  app: Hono,
  opts: { root: string },
): void {
  app.post("/api/scan", async (c) => {
    const registry = await scanRepo(opts.root);
    await saveRegistry(getRegistryPath(opts.root), registry);
    return c.json(registry);
  });
}
