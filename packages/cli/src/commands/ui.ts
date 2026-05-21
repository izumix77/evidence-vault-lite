import path from "node:path";
import pc from "picocolors";
import open from "open";
import { startServer } from "@ev-lite/server";
import { readSettings } from "@ev-lite/core";

export type UiOptions = {
  root?: string;
  port?: number;
};

export async function runUi(options: UiOptions): Promise<void> {
  const root = options.root ? path.resolve(options.root) : process.cwd();

  // 優先順位: --port オプション > settings.json > デフォルト 3137
  let port: number;
  if (options.port !== undefined) {
    port = options.port;
  } else {
    const settings = await readSettings(root);
    port = settings.port ?? 3137;
  }

  const result = await startServer({ root, port });
  const url = `http://localhost:${result.port}`;

  console.log(pc.green("✔"), "EvidenceVault Lite UI");
  console.log(pc.green("✔"), `Serving: ${url}`);
  console.log(pc.green("✔"), `Root: ${root}`);

  await open(url);
}
