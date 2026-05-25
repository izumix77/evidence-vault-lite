import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { generateSnapshot } from "@ev-lite/core";

type SnapshotRequestBody = {
  path: string;
  stack?: string;
  title?: string;
  output?: string;
  include?: string[];
  exclude?: string[];
  noContent?: boolean;
  deps?: boolean;
  maxDepth?: number;
  includeTests?: boolean;
  noDepTree?: boolean;
};

export function registerSnapshotRoutes(
  app: Hono,
  opts: { root: string },
): void {
  app.post("/api/snapshot", async (c) => {
    const body = await c.req.json<SnapshotRequestBody>();
    if (!body || typeof body.path !== "string" || !body.path) {
      throw new HTTPException(400, {
        message: "missing 'path' in request body",
      });
    }
    const meta = await generateSnapshot({
      path: body.path,
      root: opts.root,
      stack: body.stack,
      title: body.title,
      output: body.output,
      include: body.include,
      exclude: body.exclude,
      noContent: body.noContent,
      deps: body.deps,
      maxDepth: body.maxDepth,
      includeTests: body.includeTests,
      noDepTree: body.noDepTree,
    });
    return c.json(meta);
  });
}
