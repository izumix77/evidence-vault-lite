import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  loadRegistry,
  readMarkdownFile,
  writeMarkdownFile,
  initMeta,
  getRegistryPath,
} from "@ev-lite/core";

type PutBody = {
  frontmatter: Record<string, unknown>;
  body: string;
};

export function registerFilesRoutes(
  app: Hono,
  opts: { root: string },
): void {
  app.get("/api/files", async (c) => {
    const registry = await loadRegistry(getRegistryPath(opts.root));
    return c.json(registry.nodes);
  });

  app.get("/api/file", async (c) => {
    const filePath = c.req.query("path");
    if (!filePath) {
      throw new HTTPException(400, {
        message: "missing 'path' query parameter",
      });
    }
    const payload = await readMarkdownFile(opts.root, filePath);
    return c.json(payload);
  });

  app.put("/api/file", async (c) => {
    const filePath = c.req.query("path");
    if (!filePath) {
      throw new HTTPException(400, {
        message: "missing 'path' query parameter",
      });
    }
    const body = await c.req.json<PutBody>();
    await writeMarkdownFile(opts.root, filePath, body.frontmatter, body.body);
    return c.json({ ok: true });
  });

  app.post("/api/file/init-meta", async (c) => {
    const filePath = c.req.query("path");
    if (!filePath) {
      throw new HTTPException(400, {
        message: "missing 'path' query parameter",
      });
    }
    const result = await initMeta(opts.root, filePath);
    if (result === "skipped") {
      throw new HTTPException(409, {
        message: "frontmatter already exists",
      });
    }
    const payload = await readMarkdownFile(opts.root, filePath);
    return c.json(payload);
  });
}
