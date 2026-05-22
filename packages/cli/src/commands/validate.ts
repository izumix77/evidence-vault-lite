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
  showImpact?: string;
  showOrphans?: boolean;
  showDepends?: boolean;
  showCycles?: boolean;
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

  if (options.showImpact) {
    const targetId = options.showImpact;

    type ImpactEntry = { id: string; via: string };
    const impactDocs: ImpactEntry[] = [];
    const impactPacks: ImpactEntry[] = [];

    for (const node of registry.nodes) {
      const source = node.ev_id ?? node.path;
      if (node.depends_on.includes(targetId))
        impactDocs.push({ id: source, via: "depends_on" });
      if (node.related.includes(targetId))
        impactDocs.push({ id: source, via: "related" });
      if (node.supersedes.includes(targetId))
        impactDocs.push({ id: source, via: "supersedes" });
    }

    for (const packId of packIds) {
      try {
        const pack = await readPackConfig(root, packId);
        if (pack.mustRead.includes(targetId))
          impactPacks.push({ id: pack.id, via: "mustRead" });
      } catch {
        // 読み込み失敗は無視
      }
    }

    console.log("");
    console.log(`Impact of ${pc.cyan(targetId)}:`);

    if (impactDocs.length === 0 && impactPacks.length === 0) {
      console.log("  (no references found)");
    } else {
      if (impactDocs.length > 0) {
        console.log("  Docs:");
        for (const entry of impactDocs) {
          console.log(`    ${entry.id} ${pc.gray(`(${entry.via})`)}`);
        }
      }
      if (impactPacks.length > 0) {
        console.log("  Packs:");
        for (const entry of impactPacks) {
          console.log(`    ${entry.id} ${pc.gray(`(${entry.via})`)}`);
        }
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

  if (options.showOrphans) {
    const referencedEvIds = new Set<string>();

    for (const node of registry.nodes) {
      for (const id of [
        ...node.depends_on,
        ...node.related,
        ...node.supersedes,
      ]) {
        referencedEvIds.add(id);
      }
    }

    for (const packId of packIds) {
      try {
        const pack = await readPackConfig(root, packId);
        for (const id of pack.mustRead) {
          referencedEvIds.add(id);
        }
      } catch {
        // 無視
      }
    }

    const orphans = registry.nodes.filter(
      (node) => node.ev_id !== null && !referencedEvIds.has(node.ev_id),
    );

    console.log("");
    console.log("Orphan nodes (not referenced by any doc or pack):");
    if (orphans.length === 0) {
      console.log("  (none)");
    } else {
      for (const node of orphans) {
        console.log(`  ${node.ev_id} ${pc.gray(`(${node.path})`)}`);
      }
    }
  }

  if (options.showDepends) {
    const nodesWithDeps = registry.nodes.filter(
      (node) =>
        node.ev_id !== null &&
        (node.depends_on.length > 0 ||
          node.related.length > 0 ||
          node.supersedes.length > 0),
    );

    console.log("");
    console.log("Dependency structure:");

    if (nodesWithDeps.length === 0) {
      console.log("  (none)");
    } else {
      for (const node of nodesWithDeps) {
        console.log(`  ${node.ev_id}`);
        for (const id of node.depends_on) {
          console.log(`    depends_on  → ${id}`);
        }
        for (const id of node.related) {
          console.log(`    related     → ${id}`);
        }
        for (const id of node.supersedes) {
          console.log(`    supersedes  → ${id}`);
        }
      }
    }
  }

  if (options.showCycles) {
    const adjacency = new Map<string, string[]>();
    for (const node of registry.nodes) {
      if (!node.ev_id) continue;
      adjacency.set(node.ev_id, [...node.depends_on, ...node.supersedes]);
    }

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (id: string, path: string[]): void => {
      if (inStack.has(id)) {
        const cycleStart = path.indexOf(id);
        cycles.push(path.slice(cycleStart));
        return;
      }
      if (visited.has(id)) return;
      visited.add(id);
      inStack.add(id);
      for (const neighbor of adjacency.get(id) ?? []) {
        dfs(neighbor, [...path, neighbor]);
      }
      inStack.delete(id);
    };

    for (const id of adjacency.keys()) {
      dfs(id, [id]);
    }

    console.log("");
    console.log("Cycle detection:");
    if (cycles.length === 0) {
      console.log("  (no cycles found)");
    } else {
      for (const cycle of cycles) {
        console.log(`  ${pc.red("CYCLE:")} ${cycle.join(" → ")}`);
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
