import path from "node:path";
import pc from "picocolors";
import { scanRepo, saveRegistry } from "@ev-lite/core";

export type ScanOptions = {
  root?: string;
  output?: string;
};

export async function runScan(options: ScanOptions): Promise<void> {
  const root = options.root ? path.resolve(options.root) : process.cwd();
  const output =
    options.output ?? path.join(root, ".ev-lite", "registry.json");

  const registry = await scanRepo(root);
  await saveRegistry(output, registry);

  const frontmatterCount = registry.nodes.filter(
    (n) => n.ev_id !== null,
  ).length;

  console.log(pc.green("✔"), `Scanned ${registry.nodes.length} files`);
  console.log(pc.green("✔"), `${frontmatterCount} frontmatter blocks found`);
  console.log(pc.green("✔"), `registry.json generated → ${output}`);
}
