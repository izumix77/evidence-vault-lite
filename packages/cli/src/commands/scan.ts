import path from "node:path";
import pc from "picocolors";
import {
  scanFiles,
  parseFile,
  buildRegistry,
  saveRegistry,
} from "@ev-lite/core";

export type ScanOptions = {
  root?: string;
  output?: string;
};

export async function runScan(options: ScanOptions): Promise<void> {
  const root = options.root ? path.resolve(options.root) : process.cwd();
  const output =
    options.output ?? path.join(root, ".ev-lite", "registry.json");

  const files = await scanFiles(root);
  const nodes = await Promise.all(files.map((f) => parseFile(root, f)));
  const frontmatterCount = nodes.filter((n) => n.ev_id !== null).length;

  const registry = buildRegistry(root, nodes);
  await saveRegistry(output, registry);

  console.log(pc.green("✔"), `Scanned ${files.length} files`);
  console.log(pc.green("✔"), `${frontmatterCount} frontmatter blocks found`);
  console.log(pc.green("✔"), `registry.json generated → ${output}`);
}
