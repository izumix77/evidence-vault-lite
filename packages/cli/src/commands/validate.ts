import path from "node:path";
import pc from "picocolors";
import {
  loadRegistry,
  listPackIds,
  readPackConfig,
  type EvidenceStatus,
  type EvidenceNode,
} from "@ev-lite/core";

export type ValidateOptions = {
  root?: string;
  strict?: boolean;
  showChains?: boolean;
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

  const supersededBy = new Map<string, string>();
  for (const node of registry.nodes) {
    if (node.ev_id === null) continue;
    for (const target of node.supersedes) {
      supersededBy.set(target, node.ev_id);
    }
  }

  const supersededWithDependents = new Map<string, string>();
  for (const node of registry.nodes) {
    for (const target of node.depends_on) {
      const supersedorId = supersededBy.get(target);
      if (supersedorId !== undefined) {
        supersededWithDependents.set(target, supersedorId);
      }
    }
  }
  for (const [supersededId, supersedorId] of supersededWithDependents) {
    warn(
      `${supersededId} is Superseded\n      (superseded by ${supersedorId})`,
    );
  }

  const packIds = await listPackIds(root);
  for (const packId of packIds) {
    let pack;
    try {
      pack = await readPackConfig(root, packId);
    } catch (err: unknown) {
      warn(
        `failed to read pack ${packId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }
    if (pack.status === "draft") continue;
    for (const evId of pack.mustRead) {
      if (supersededBy.has(evId)) {
        warn(
          `${pack.id} mustRead contains Superseded node\n      → ${evId}`,
        );
      }
    }
  }

  if (options.showChains) {
    const nodeByEvId = new Map<string, EvidenceNode>();
    for (const node of registry.nodes) {
      if (node.ev_id) nodeByEvId.set(node.ev_id, node);
    }

    const chainRoots: string[] = [];
    for (const node of registry.nodes) {
      if (!node.ev_id) continue;
      if (node.supersedes.length === 0) continue;
      if (supersededBy.has(node.ev_id)) continue;
      chainRoots.push(node.ev_id);
    }
    chainRoots.sort();

    const printChain = (
      evId: string,
      depth: number,
      visited: Set<string>,
    ): void => {
      if (visited.has(evId)) {
        console.log(`${"  ".repeat(depth + 1)}→ supersedes ${evId} (cycle)`);
        return;
      }
      visited.add(evId);
      if (depth === 0) {
        console.log(`  ${evId}`);
      } else {
        console.log(`${"  ".repeat(depth + 1)}→ supersedes ${evId}`);
      }
      const node = nodeByEvId.get(evId);
      if (!node) return;
      for (const target of node.supersedes) {
        printChain(target, depth + 1, visited);
      }
    };

    console.log("");
    console.log("Supersedes chains:");
    if (chainRoots.length === 0) {
      console.log("  (none)");
    } else {
      for (const rootId of chainRoots) {
        printChain(rootId, 0, new Set());
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
