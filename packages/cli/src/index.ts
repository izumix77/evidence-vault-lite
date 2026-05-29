#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runScan } from "./commands/scan.js";
import { runPack } from "./commands/pack.js";
import { runInitMeta } from "./commands/init-meta.js";
import { runValidate } from "./commands/validate.js";
import { runUi } from "./commands/ui.js";
import { runSnapshot } from "./commands/snapshot.js";
import { runReport } from "./commands/report.js";
import { runHandover } from "./commands/handover.js";
import { createContextCommand } from "./commands/context.js";

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

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
  .option("--show-chains", "print supersedes chains derived from topology")
  .option(
    "--show-impact <ev_id>",
    "show all docs and packs referencing the given ev_id",
  )
  .option("--show-orphans", "list nodes not referenced by any doc or pack")
  .option(
    "--show-depends",
    "show depends_on / related / supersedes structure",
  )
  .option(
    "--show-cycles",
    "detect circular dependencies in depends_on / supersedes",
  )
  .option("--output <path>", "save validate output to a file")
  .option("--focus <ev_id>", "show all info for the specified ev_id")
  .option(
    "--focus-dir <path>",
    "show all info for nodes in the specified directory",
  )
  .option(
    "--active-only",
    "with --show-depends: skip superseded related nodes",
  )
  .option(
    "--affected <file>",
    "find snapshots and packs affected by a file change",
  )
  .option("--json", "output affected result as JSON (use with --affected)")
  .action(
    async (opts: {
      root?: string;
      strict?: boolean;
      showChains?: boolean;
      showImpact?: string;
      showOrphans?: boolean;
      showDepends?: boolean;
      showCycles?: boolean;
      output?: string;
      focus?: string;
      focusDir?: string;
      activeOnly?: boolean;
      affected?: string;
      json?: boolean;
    }) => {
      await runValidate({
        root: opts.root,
        strict: opts.strict,
        showChains: opts.showChains,
        showImpact: opts.showImpact,
        showOrphans: opts.showOrphans,
        showDepends: opts.showDepends,
        showCycles: opts.showCycles,
        output: opts.output,
        focus: opts.focus,
        focusDir: opts.focusDir,
        activeOnly: opts.activeOnly,
        affected: opts.affected,
        json: opts.json,
      });
    },
  );

program
  .command("ui")
  .description("Start the local web UI server")
  .option("--root <path>", "root directory")
  .option("--port <port>", "port number", (v: string) => Number.parseInt(v, 10))
  .action(async (opts: { root?: string; port?: number }) => {
    await runUi({ root: opts.root, port: opts.port });
  });

program
  .command("snapshot <path>")
  .description("Generate a code snapshot .md from a directory")
  .option("--output <path>", "output file path")
  .option("--stack <stack>", "frontmatter stack value")
  .option("--title <title>", "snapshot title")
  .option(
    "--include <glob>",
    "include glob (repeatable; replaces defaults)",
    collect,
    [] as string[],
  )
  .option(
    "--exclude <glob>",
    "additional exclude glob (repeatable)",
    collect,
    [] as string[],
  )
  .option("--no-content", "tree only (omit file content)")
  .option("--deps", "trace import/export dependencies from entrypoint")
  .option(
    "--max-depth <n>",
    "max traversal depth (default: 10)",
    (v: string) => Number.parseInt(v, 10),
  )
  .option("--include-tests", "include .spec.ts / .test.ts files")
  .option("--no-dep-tree", "omit dependency tree section from snapshot.md")
  .option(
    "--dry-run",
    "resolve dependency snapshot without writing snapshot.md",
  )
  .option(
    "--json",
    "print dependency graph as JSON without writing snapshot.md",
  )
  .action(
    async (
      inputPath: string,
      opts: {
        output?: string;
        stack?: string;
        title?: string;
        include: string[];
        exclude: string[];
        content?: boolean;
        deps?: boolean;
        maxDepth?: number;
        includeTests?: boolean;
        depTree?: boolean;
        dryRun?: boolean;
        json?: boolean;
      },
    ) => {
      await runSnapshot(inputPath, {
        output: opts.output,
        stack: opts.stack,
        title: opts.title,
        include: opts.include,
        exclude: opts.exclude,
        noContent: opts.content === false,
        deps: opts.deps,
        maxDepth: opts.maxDepth,
        includeTests: opts.includeTests,
        noDepTree: opts.depTree === false,
        dryRun: opts.dryRun,
        json: opts.json,
      });
    },
  );

program
  .command("report <name>")
  .description("Generate an EVReport scaffold")
  .option(
    "--kind <kind>",
    "report kind (implementation|analysis|architecture|research|incident|observer|retrospective)",
    "implementation",
  )
  .option("--stack <stack>", "frontmatter stack value", "docs")
  .option("--output <path>", "output file path")
  .action(
    async (
      name: string,
      opts: { kind?: string; stack?: string; output?: string },
    ) => {
      await runReport(name, {
        kind: opts.kind,
        stack: opts.stack,
        output: opts.output,
      });
    },
  );

program
  .command("handover <name>")
  .description("Generate a HandoverReport scaffold")
  .option("--output <path>", "output file path")
  .action(async (name: string, opts: { output?: string }) => {
    await runHandover(name, { output: opts.output });
  });

program.addCommand(createContextCommand());

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(pc.red("ERROR:"), message);
  process.exit(1);
});
