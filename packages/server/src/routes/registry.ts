import type { Hono } from "hono";
import { loadRegistry, getRegistryPath } from "@ev-lite/core";

export function registerRegistryRoutes(
  app: Hono,
  opts: { root: string },
): void {
  app.get("/api/registry", async (c) => {
    const registry = await loadRegistry(getRegistryPath(opts.root));
    return c.json(registry);
  });
}
