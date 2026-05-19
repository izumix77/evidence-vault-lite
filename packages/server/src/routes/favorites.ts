import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  readFavorites,
  addFavorite,
  deleteFavoriteAt,
} from "@ev-lite/core";

export function registerFavoritesRoutes(
  app: Hono,
  opts: { root: string },
): void {
  app.get("/api/favorites", async (c) => {
    const favorites = await readFavorites(opts.root);
    return c.json(favorites);
  });

  app.post("/api/favorites", async (c) => {
    const body = await c.req.json<{ path?: string }>();
    if (!body || typeof body.path !== "string" || !body.path.trim()) {
      throw new HTTPException(400, {
        message: "missing 'path' in request body",
      });
    }
    const next = await addFavorite(opts.root, body.path.trim());
    return c.json(next);
  });

  app.delete("/api/favorites/:idx", async (c) => {
    const idx = Number.parseInt(c.req.param("idx"), 10);
    if (!Number.isFinite(idx) || idx < 0) {
      throw new HTTPException(400, { message: "invalid index" });
    }
    const next = await deleteFavoriteAt(opts.root, idx);
    return c.json(next);
  });
}
