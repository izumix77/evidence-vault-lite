import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import pc from "picocolors";
import {
  buildPack,
  loadRegistry,
  ContextPackSchema,
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
  const configPath =
    options.config ?? path.join(root, ".ev-lite", "packs", `${packId}.json`);
  const outputPath =
    options.output ?? path.join(root, ".ev-lite", "packs", `${packId}.md`);
  const registryPath = path.join(root, ".ev-lite", "registry.json");

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
