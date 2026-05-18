#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runScan } from "./commands/scan.js";
import { runPack } from "./commands/pack.js";
import { runInitMeta } from "./commands/init-meta.js";
import { runValidate } from "./commands/validate.js";
import { runUi } from "./commands/ui.js";

const program = new Command();

program
  .name("evlite")
  .description("EvidenceVault Lite — Document Context Routing System")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan repo and generate registry.json")
  .option("--root <path>", "root directory to scan")
  .option("--output <path>", "output path for registry.json")
  .action(async (opts: { root?: string; output?: string }) => {
    await runScan({ root: opts.root, output: opts.output });
  });

program
  .command("pack <pack-id>")
  .description("Generate pack.md from a pack config")
  .option("--config <path>", "pack config JSON path")
  .option("--output <path>", "output pack.md path")
  .action(
    async (packId: string, opts: { config?: string; output?: string }) => {
      await runPack(packId, { config: opts.config, output: opts.output });
    },
  );

program
  .command("init-meta <file>")
  .description("Insert a frontmatter block into a Markdown file")
  .action(async (file: string) => {
    await runInitMeta(file);
  });

program
  .command("validate")
  .description("Validate registry integrity")
  .option("--root <path>", "root directory")
  .option("--strict", "exit 1 if any ERROR is found")
  .action(async (opts: { root?: string; strict?: boolean }) => {
    await runValidate({ root: opts.root, strict: opts.strict });
  });

program
  .command("ui")
  .description("Start the local web UI server")
  .option("--root <path>", "root directory")
  .option("--port <port>", "port number", (v: string) => Number.parseInt(v, 10))
  .action(async (opts: { root?: string; port?: number }) => {
    await runUi({ root: opts.root, port: opts.port });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(pc.red("ERROR:"), message);
  process.exit(1);
});
