import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import pc from "picocolors";
import {
  loadRegistry,
  listPackIds,
  readPackConfig,
  findAffected,
  buildImportanceReport,
  buildRiskReport,
  type ContextPack,
  type EvidenceStatus,
  type EvidenceNode,
  type ImportanceRow,
} from "@ev-lite/core";

export type ValidateOptions = {
  root?: string;
  strict?: boolean;
  showChains?: boolean;
  showImpact?: string;
  showOrphans?: boolean;
  showDepends?: boolean;
  showCycles?: boolean;
  showImportance?: boolean;
  showRisk?: boolean;
  output?: string;
  focus?: string;
  focusDir?: string;
  activeOnly?: boolean;
  affected?: string;
  json?: boolean;
};

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function padNumber(n: number, width: number): string {
  const s = String(n);
  return s.length >= width ? s : " ".repeat(width - s.length) + s;
}

function renderImportanceRow(row: ImportanceRow, evIdWidth: number): string {
  const tagSuffix =
    row.usageTags.length > 0 ? `   ${row.usageTags.join(" ")}` : "";
  return `  ${pad(row.evId, evIdWidth)}  refs: ${padNumber(row.referenceCount, 2)}  packs: ${row.packDependencyCount}${tagSuffix}`;
}

async function runAffected(
  root: string,
  file: string,
  jsonMode: boolean,
): Promise<void> {
  const result = await findAffected(file, root);

  if (jsonMode) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }

  console.log(`Affected analysis for: ${result.file}`);
  console.log("");

  if (result.affectedSnapshots.length === 0) {
    console.log("No snapshots found containing this file.");
    console.log("No packs affected.");
    return;
  }

  console.log("Snapshots containing this file:");
  const evIdWidth = Math.max(
    ...result.affectedSnapshots.map((s) => s.evId.length),
  );
  for (const s of result.affectedSnapshots) {
    console.log(`  ${pad(s.evId, evIdWidth)}  (${s.path})`);
  }
  console.log("");

  if (result.affectedPacks.length === 0) {
    console.log("Packs referencing affected snapshots:");
    console.log("  (none)");
  } else {
    console.log("Packs referencing affected snapshots:");
    const packIdWidth = Math.max(
      ...result.affectedPacks.map((p) => p.packId.length),
    );
    const pathWidth = Math.max(
      ...result.affectedPacks.map((p) => p.path.length),
    );
    for (const p of result.affectedPacks) {
      console.log(
        `  ${pad(p.packId, packIdWidth)}  (${pad(p.path, pathWidth)})  mustRead: ${p.viaEvId}`,
      );
    }
  }
  console.log("");
  console.log(
    `${result.summary.snapshotCount} snapshot(s), ${result.summary.packCount} pack(s) affected.`,
  );
}

export async function runValidate(options: ValidateOptions): Promise<void> {
  const root = options.root ? path.resolve(options.root) : process.cwd();

  if (options.affected) {
    await runAffected(root, options.affected, options.json === true);
    return;
  }

  const registryPath = path.join(root, ".ev-lite", "registry.json");
  const registry = await loadRegistry(registryPath);

  const outputLines: string[] = [];

  const log = (...args: unknown[]) => {
    const plain = args
      .map((a) =>
        typeof a === "string"
          ? a.replace(/\x1b\[[0-9;]*m/g, "")
          : String(a),
      )
      .join(" ");
    outputLines.push(plain);
    console.log(...args);
  };

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
    log(pc.yellow("WARN:"), msg);
    warnCount++;
  };
  const error = (msg: string) => {
    log(pc.red("ERROR:"), msg);
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

    log("");
    log(`Impact of ${pc.cyan(targetId)}:`);

    if (impactDocs.length === 0 && impactPacks.length === 0) {
      log("  (no references found)");
    } else {
      if (impactDocs.length > 0) {
        log("  Docs:");
        for (const entry of impactDocs) {
          log(`    ${entry.id} ${pc.gray(`(${entry.via})`)}`);
        }
      }
      if (impactPacks.length > 0) {
        log("  Packs:");
        for (const entry of impactPacks) {
          log(`    ${entry.id} ${pc.gray(`(${entry.via})`)}`);
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
        log(`${"  ".repeat(depth + 1)}→ supersedes ${evId} (cycle)`);
        return;
      }
      visited.add(evId);
      if (depth === 0) {
        log(`  ${evId}`);
      } else {
        log(`${"  ".repeat(depth + 1)}→ supersedes ${evId}`);
      }
      const node = nodeByEvId.get(evId);
      if (!node) return;
      for (const target of node.supersedes) {
        printChain(target, depth + 1, visited);
      }
    };

    log("");
    log("Supersedes chains:");
    if (chainRoots.length === 0) {
      log("  (none)");
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

    log("");
    log("Orphan nodes (not referenced by any doc or pack):");
    if (orphans.length === 0) {
      log("  (none)");
    } else {
      for (const node of orphans) {
        log(`  ${node.ev_id} ${pc.gray(`(${node.path})`)}`);
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

    log("");
    log("Dependency structure:");

    if (nodesWithDeps.length === 0) {
      log("  (none)");
    } else {
      for (const node of nodesWithDeps) {
        log(`  ${node.ev_id}`);
        for (const id of node.depends_on) {
          log(`    depends_on  → ${id}`);
        }
        for (const id of node.related) {
          if (options.activeOnly && supersededBy.has(id)) continue;
          log(`    related     → ${id}`);
        }
        for (const id of node.supersedes) {
          log(`    supersedes  → ${id}`);
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

    const dfs = (id: string, trail: string[]): void => {
      if (inStack.has(id)) {
        const cycleStart = trail.indexOf(id);
        cycles.push(trail.slice(cycleStart));
        return;
      }
      if (visited.has(id)) return;
      visited.add(id);
      inStack.add(id);
      for (const neighbor of adjacency.get(id) ?? []) {
        dfs(neighbor, [...trail, neighbor]);
      }
      inStack.delete(id);
    };

    for (const id of adjacency.keys()) {
      dfs(id, [id]);
    }

    log("");
    log("Cycle detection:");
    if (cycles.length === 0) {
      log("  (no cycles found)");
    } else {
      for (const cycle of cycles) {
        log(`  ${pc.red("CYCLE:")} ${cycle.join(" → ")}`);
      }
    }
  }

  if (options.focus) {
    const targetId = options.focus;
    const targetNode = registry.nodes.find((n) => n.ev_id === targetId);

    log("");
    log(`Focus: ${targetId}`);

    if (!targetNode) {
      log(`  (not found in registry)`);
    } else {
      type ImpactEntry = { id: string; via: string };
      const focusImpactDocs: ImpactEntry[] = [];
      const focusImpactPacks: ImpactEntry[] = [];

      for (const node of registry.nodes) {
        const source = node.ev_id ?? node.path;
        if (node.depends_on.includes(targetId))
          focusImpactDocs.push({ id: source, via: "depends_on" });
        if (node.related.includes(targetId))
          focusImpactDocs.push({ id: source, via: "related" });
        if (node.supersedes.includes(targetId))
          focusImpactDocs.push({ id: source, via: "supersedes" });
      }
      for (const packId of packIds) {
        try {
          const pack = await readPackConfig(root, packId);
          if (pack.mustRead.includes(targetId))
            focusImpactPacks.push({ id: pack.id, via: "mustRead" });
        } catch {
          // 無視
        }
      }

      log("  Referenced by:");
      if (focusImpactDocs.length === 0 && focusImpactPacks.length === 0) {
        log("    (none)");
      } else {
        for (const e of focusImpactDocs) log(`    ${e.id} (${e.via})`);
        for (const e of focusImpactPacks) log(`    ${e.id} (${e.via})`);
      }

      log("  Dependencies:");
      if (
        targetNode.depends_on.length === 0 &&
        targetNode.related.length === 0 &&
        targetNode.supersedes.length === 0
      ) {
        log("    (none)");
      } else {
        for (const id of targetNode.depends_on)
          log(`    depends_on  → ${id}`);
        for (const id of targetNode.related)
          log(`    related     → ${id}`);
        for (const id of targetNode.supersedes)
          log(`    supersedes  → ${id}`);
      }
    }
  }

  if (options.focusDir) {
    const dirPrefix = options.focusDir
      .replace(/\\/g, "/")
      .replace(/\/?$/, "/");
    const targetNodes = registry.nodes.filter(
      (n) =>
        n.ev_id !== null &&
        n.path.replace(/\\/g, "/").startsWith(dirPrefix),
    );

    log("");
    log(`Focus dir: ${options.focusDir} (${targetNodes.length} nodes)`);

    for (const targetNode of targetNodes) {
      log(`  ${targetNode.ev_id}`);
      for (const id of targetNode.depends_on)
        log(`    depends_on  → ${id}`);
      for (const id of targetNode.related)
        log(`    related     → ${id}`);
      for (const id of targetNode.supersedes)
        log(`    supersedes  → ${id}`);
    }
  }

  if (options.showImportance) {
    const report = buildImportanceReport(registry);
    log("");
    log("─── IMPORTANCE REPORT ──────────────────────────────");
    log("");
    log("TOP REFERENCED");
    if (report.topReferenced.length === 0) {
      log("  (none)");
    } else {
      const evIdWidth = Math.max(
        ...report.topReferenced.map((r) => r.evId.length),
      );
      for (const row of report.topReferenced) {
        log(renderImportanceRow(row, evIdWidth));
      }
    }
    log("");
    log("MOST PACK-DEPENDENT");
    if (report.topPackDependent.length === 0) {
      log("  (none)");
    } else {
      const evIdWidth = Math.max(
        ...report.topPackDependent.map((r) => r.evId.length),
      );
      for (const row of report.topPackDependent) {
        log(`  ${pad(row.evId, evIdWidth)}  packs: ${row.packDependencyCount}`);
      }
    }
    log("");
    log("COLD (unreferenced)");
    if (report.cold.length === 0) {
      log("  (none)");
    } else {
      for (const id of report.cold) log(`  ${id}`);
    }
  }

  if (options.showRisk) {
    const packs: ContextPack[] = [];
    for (const pid of packIds) {
      try {
        packs.push(await readPackConfig(root, pid));
      } catch {
        // silent skip — malformed pack already warned above
      }
    }
    const report = buildRiskReport(registry, packs);
    log("");
    log("─── RISK SIGNALS ───────────────────────────────────");

    if (report.orphan.length > 0) {
      log("");
      log("ORPHAN (not referenced by any pack or node)");
      for (const id of report.orphan) log(`  ${id}`);
    }
    if (report.stale.length > 0) {
      log("");
      log("STALE (explicitly marked stale)");
      for (const id of report.stale) log(`  ${id}`);
    }
    if (report.superseded.length > 0) {
      log("");
      log("SUPERSEDED (replaced by newer artifact)");
      for (const id of report.superseded) log(`  ${id}`);
    }
    if (report.cold.length > 0) {
      log("");
      log("COLD (active but unreferenced)");
      for (const id of report.cold) log(`  ${id}`);
    }
    if (report.staleDependencies.length > 0) {
      log("");
      log("STALE DEPENDENCY");
      for (const sd of report.staleDependencies) {
        log(`  ${sd.source} → ${sd.target} (${sd.targetTag})`);
      }
    }
  }

  log("");
  log(
    `Validation complete: ${pc.red(`${errorCount} error(s)`)}, ${pc.yellow(`${warnCount} warning(s)`)}`,
  );

  if (options.output) {
    const outputPath = path.resolve(options.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, outputLines.join("\n") + "\n", "utf8");
    console.log(pc.green("✔"), `validate output saved → ${outputPath}`);
  }

  if (options.strict && errorCount > 0) {
    process.exit(1);
  }
}
