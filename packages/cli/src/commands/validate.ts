import path from "node:path";
import pc from "picocolors";
import { loadRegistry, type EvidenceStatus } from "@ev-lite/core";

export type ValidateOptions = {
  root?: string;
  strict?: boolean;
};

export async function runValidate(options: ValidateOptions): Promise<void> {
  const root = options.root ? path.resolve(options.root) : process.cwd();
  const registryPath = path.join(root, ".ev-lite", "registry.json");
  const registry = await loadRegistry(registryPath);

  const evIdCounts = new Map<string, number>();
  const statusByEvId = new Map<string, EvidenceStatus | undefined>();
  for (const node of registry.nodes) {
    if (node.ev_id === null) continue;
    evIdCounts.set(node.ev_id, (evIdCounts.get(node.ev_id) ?? 0) + 1);
    statusByEvId.set(node.ev_id, node.status);
  }
  const existingEvIds = new Set(evIdCounts.keys());

  let errorCount = 0;
  let warnCount = 0;

  const warn = (msg: string) => {
    console.log(pc.yellow("WARN:"), msg);
    warnCount++;
  };
  const error = (msg: string) => {
    console.log(pc.red("ERROR:"), msg);
    errorCount++;
  };

  for (const [evId, count] of evIdCounts) {
    if (count > 1) {
      error(`duplicate ev_id → ${evId} (${count} files)`);
    }
  }

  for (const node of registry.nodes) {
    const source = node.ev_id ?? node.path;

    for (const target of node.depends_on) {
      if (!existingEvIds.has(target)) {
        warn(`${source} depends_on missing → ${target}`);
        continue;
      }
      if (node.status === "active") {
        const targetStatus = statusByEvId.get(target);
        if (targetStatus === "deprecated" || targetStatus === "archived") {
          warn(
            `active document references ${targetStatus} → ${source} depends_on ${target}`,
          );
        }
      }
    }

    for (const target of node.supersedes) {
      if (!existingEvIds.has(target)) {
        warn(`${source} supersedes missing → ${target}`);
      }
    }
  }

  console.log("");
  console.log(
    `Validation complete: ${pc.red(`${errorCount} error(s)`)}, ${pc.yellow(`${warnCount} warning(s)`)}`,
  );

  if (options.strict && errorCount > 0) {
    process.exit(1);
  }
}
