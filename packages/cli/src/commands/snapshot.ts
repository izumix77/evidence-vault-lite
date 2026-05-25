import pc from "picocolors";
import { generateSnapshot } from "@ev-lite/core";

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
};

export async function runSnapshot(
  inputPath: string,
  options: RunSnapshotOptions,
): Promise<void> {
  const root = process.cwd();
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
