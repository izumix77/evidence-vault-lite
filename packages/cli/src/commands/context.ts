import { Command } from "commander";
import pc from "picocolors";
import { generateContext, generateContextDryRun } from "@ev-lite/core";

type ContextCliOptions = {
  goal: string;
  stack?: string;
  maxDepth?: number;
  includeTests?: boolean;
  content?: boolean;
  outputDir?: string;
  force?: boolean;
  dryRun?: boolean;
};

export function createContextCommand(): Command {
  return new Command("context")
    .description(
      "compile agent context: deps snapshot + pack in one command",
    )
    .argument("<entrypoint>", "entrypoint file to trace dependencies from")
    .requiredOption("--goal <text>", "goal for the AI agent")
    .option("--stack <stack>", "frontmatter stack value")
    .option(
      "--max-depth <n>",
      "max traversal depth (default: 10)",
      (v: string) => Number.parseInt(v, 10),
    )
    .option("--include-tests", "include .spec.ts / .test.ts files")
    .option("--no-content", "snapshot tree only, no file contents")
    .option(
      "--output-dir <path>",
      "output root directory (default: .ev-lite)",
    )
    .option("--force", "overwrite existing pack")
    .option(
      "--dry-run",
      "print pack.json preview without writing files",
    )
    .action(async (entrypoint: string, opts: ContextCliOptions) => {
      const root = process.cwd();

      if (opts.dryRun) {
        const result = await generateContextDryRun({
          path: entrypoint,
          root,
          goal: opts.goal,
          stack: opts.stack,
          maxDepth: opts.maxDepth,
          includeTests: opts.includeTests,
        });
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        return;
      }

      const result = await generateContext({
        path: entrypoint,
        root,
        goal: opts.goal,
        stack: opts.stack,
        maxDepth: opts.maxDepth,
        includeTests: opts.includeTests,
        noContent: opts.content === false,
        outputDir: opts.outputDir,
        force: opts.force,
      });

      console.log(
        pc.green("✔") + ` snapshot.md generated  → ${result.snapshotOutput}`,
      );
      console.log(
        pc.green("✔") + ` ev_id                  → ${result.snapshotEvId}`,
      );
      console.log(
        pc.green("✔") + ` pack.json saved        → ${result.packJsonPath}`,
      );
      console.log(
        pc.green("✔") + ` pack.md generated      → ${result.packMdPath}`,
      );
      console.log(
        pc.green("✔") + ` pack_id                → ${result.packId}`,
      );
    });
}
