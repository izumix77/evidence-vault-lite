import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

export { createApp } from "./app.js";
export type { AppOptions } from "./app.js";

export type StartServerOptions = {
  root: string;
  port?: number;
};

export type StartServerResult = {
  port: number;
};

export async function startServer(
  options: StartServerOptions,
): Promise<StartServerResult> {
  const port = options.port ?? 3137;
  const app = createApp({ root: options.root });

  return new Promise<StartServerResult>((resolve) => {
    serve({ fetch: app.fetch, port }, (info) => {
      resolve({ port: info.port });
    });
  });
}
