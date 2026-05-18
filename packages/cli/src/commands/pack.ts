import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import pc from "picocolors";
import {
  buildPack,
  loadRegistry,
  ContextPackSchema,
  getPackConfigPath,
  getPackOutputPath,
  getRegistryPath,
} from "@ev-lite/core";

export type PackOptions = {
  config?: string;
  output?: string;
};

export async function runPack(
  packId: string,
  options: PackOptions,
): Promise<void> {
  const root = process.cwd();
  const configPath = options.config ?? getPackConfigPath(root, packId);
  const outputPath = options.output ?? getPackOutputPath(root, packId);
  const registryPath = getRegistryPath(root);

  const configRaw = await readFile(configPath, "utf8");
  const pack = ContextPackSchema.parse(JSON.parse(configRaw));

  const registry = await loadRegistry(registryPath);

  for (const evId of pack.mustRead) {
    const node = registry.nodes.find((n) => n.ev_id === evId);
    if (node && node.status && node.status !== "active") {
      console.log(
        pc.yellow("WARN:"),
        `${evId} is ${node.status} — included by explicit mustRead`,
      );
    }
  }

  const md = await buildPack(pack, registry, root);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, md, "utf8");

  console.log(pc.green("✔"), `Resolved ${pack.mustRead.length} nodes`);
  console.log(pc.green("✔"), `pack.md generated → ${outputPath}`);
}
