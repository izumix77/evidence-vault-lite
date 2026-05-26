import pc from "picocolors";
import {
  DEFAULT_DEPS_MAX_DEPTH,
  generateSnapshot,
  resolveDeps,
  toDepGraphJsonOutput,
} from "@ev-lite/core";
import type { DepGraph } from "@ev-lite/core";

export type RunSnapshotOptions = {
  output?: string;
  stack?: string;
  title?: string;
  include?: string[];
  exclude?: string[];
  noContent?: boolean;
  deps?: boolean;
  maxDepth?: number;
  includeTests?: boolean;
  noDepTree?: boolean;
  dryRun?: boolean;
  json?: boolean;
};

function printDepDryRun(graph: DepGraph): void {
  console.log(
    pc.green("✔"),
    `Resolved ${graph.files.length} files (${graph.edges.length} edges)`,
  );
  console.log(pc.green("✔"), `Skipped ${graph.skipped.length} imports`);

  console.log("");
  console.log("Files:");
  for (const file of graph.files) {
    console.log(`- ${file}`);
  }

  console.log("");
  console.log("Skipped Imports:");
  if (graph.skipped.length === 0) {
    console.log("(none)");
  } else {
    for (const skip of graph.skipped) {
      console.log(`- ${skip.from} -> ${skip.specifier} (${skip.reason})`);
    }
  }
}

export async function runSnapshot(
  inputPath: string,
  options: RunSnapshotOptions,
): Promise<void> {
  const root = process.cwd();

  if ((options.dryRun || options.json) && !options.deps) {
    throw new Error("--dry-run/--json currently require --deps");
  }

  if (options.deps && (options.json || options.dryRun)) {
    const maxDepth = options.maxDepth ?? DEFAULT_DEPS_MAX_DEPTH;
    const includeTests = options.includeTests ?? false;

    const graph = await resolveDeps(inputPath, root, {
      maxDepth,
      includeTests,
    });

    if (options.json) {
      const payload = toDepGraphJsonOutput(graph, { maxDepth, includeTests });
      process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
      return;
    }

    printDepDryRun(graph);
    return;
  }

  const meta = await generateSnapshot({
    path: inputPath,
    root,
    output: options.output,
    stack: options.stack,
    title: options.title,
    include: options.include?.length ? options.include : undefined,
    exclude: options.exclude?.length ? options.exclude : undefined,
    noContent: options.noContent,
    deps: options.deps,
    maxDepth: options.maxDepth,
    includeTests: options.includeTests,
    noDepTree: options.noDepTree,
  });

  if (options.deps && meta.depGraph) {
    console.log(
      pc.green("✔"),
      `Resolved ${meta.fileCount} files (${meta.depGraph.edges} edges)`,
    );
    console.log(pc.green("✔"), `Skipped ${meta.depGraph.skipped} imports`);
  } else {
    console.log(pc.green("✔"), `Scanned ${meta.fileCount} files`);
  }
  console.log(pc.green("✔"), `snapshot.md generated → ${meta.output}`);
  console.log(pc.green("✔"), `ev_id: ${meta.evId}`);
}
