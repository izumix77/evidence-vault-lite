import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { registerRegistryRoutes } from "./routes/registry.js";
import { registerFilesRoutes } from "./routes/files.js";
import { registerPacksRoutes } from "./routes/packs.js";
import { registerScanRoutes } from "./routes/scan.js";
import { registerSnapshotRoutes } from "./routes/snapshot.js";
import { registerFavoritesRoutes } from "./routes/favorites.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UI_DIST_PATH = path.resolve(
  __dirname,
  "../../../apps/evlite-ui/dist",
);

export type AppOptions = {
  root: string;
};

export function createApp(opts: AppOptions): Hono {
  const app = new Hono();
  app.use("*", cors());

  registerRegistryRoutes(app, opts);
  registerFilesRoutes(app, opts);
  registerPacksRoutes(app, opts);
  registerScanRoutes(app, opts);
  registerSnapshotRoutes(app, opts);
  registerFavoritesRoutes(app, opts);

  app.use("/*", serveStatic({ root: UI_DIST_PATH }));

  app.notFound(async (c) => {
    const reqPath = new URL(c.req.url).pathname;
    if (reqPath.startsWith("/api/")) {
      return c.text("Not Found", 404);
    }
    try {
      const html = await readFile(
        path.join(UI_DIST_PATH, "index.html"),
        "utf8",
      );
      return c.html(html);
    } catch {
      return c.text(
        "UI not built. Run: pnpm --filter @ev-lite/ui build",
        500,
      );
    }
  });

  return app;
}
