import pc from "picocolors";
import { generateSnapshot } from "@ev-lite/core";

export type RunSnapshotOptions = {
  output?: string;
  stack?: string;
  title?: string;
  include?: string[];
  exclude?: string[];
  noContent?: boolean;
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
  });

  console.log(pc.green("✔"), `Scanned ${meta.fileCount} files`);
  console.log(pc.green("✔"), `snapshot.md generated → ${meta.output}`);
  console.log(pc.green("✔"), `ev_id: ${meta.evId}`);
}
