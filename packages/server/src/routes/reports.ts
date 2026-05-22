import type { Hono } from "hono";
import { loadRegistry, getRegistryPath } from "@ev-lite/core";

export function registerReportsRoutes(
  app: Hono,
  opts: { root: string },
): void {
  app.get("/api/reports", async (c) => {
    const registry = await loadRegistry(getRegistryPath(opts.root));
    // EvidenceNode に type フィールドはないため、ev_id を持つ全 node を返す。
    // type: "report" の厳密なフィルタは EVReport が scan に組み込まれた後の拡張とし、
    // 現状は UI 側でフィルタリングする。
    const reports = registry.nodes.filter((node) => node.ev_id !== null);
    return c.json(reports);
  });
}
