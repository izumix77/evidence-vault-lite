import type {
  ContextPack,
  DerivedTag,
  EvidenceNode,
} from "@ev-lite/shared";
import type { Registry } from "./registry.js";

export type ImportanceRow = {
  evId: string;
  referenceCount: number;
  packDependencyCount: number;
  usageTags: DerivedTag[];
};

export type ImportanceReport = {
  topReferenced: ImportanceRow[];
  topPackDependent: ImportanceRow[];
  cold: string[];
};

export type StaleDependency = {
  source: string;
  target: string;
  targetTag: "STALE" | "OLD";
};

export type RiskReport = {
  orphan: string[];
  stale: string[];
  superseded: string[];
  cold: string[];
  staleDependencies: StaleDependency[];
};

const USAGE_TAGS: ReadonlySet<DerivedTag> = new Set<DerivedTag>([
  "HOT",
  "CORE",
  "COLD",
  "FOUNDATIONAL",
]);

const TOP_LIMIT = 10;

function withEvId(
  nodes: EvidenceNode[],
): Array<EvidenceNode & { ev_id: string }> {
  return nodes.filter(
    (n): n is EvidenceNode & { ev_id: string } => n.ev_id !== null,
  );
}

function rowFor(node: EvidenceNode & { ev_id: string }): ImportanceRow {
  const imp = node.importance ?? {};
  const tags = (node.derived_tags ?? []).filter((t) => USAGE_TAGS.has(t));
  return {
    evId: node.ev_id,
    referenceCount: imp.reference_count ?? 0,
    packDependencyCount: imp.pack_dependency_count ?? 0,
    usageTags: tags,
  };
}

export function buildImportanceReport(registry: Registry): ImportanceReport {
  const nodes = withEvId(registry.nodes);

  const topReferenced = [...nodes]
    .map(rowFor)
    .filter((r) => r.referenceCount > 0)
    .sort((a, b) => {
      if (b.referenceCount !== a.referenceCount) {
        return b.referenceCount - a.referenceCount;
      }
      return a.evId.localeCompare(b.evId);
    })
    .slice(0, TOP_LIMIT);

  const topPackDependent = [...nodes]
    .map(rowFor)
    .filter((r) => r.packDependencyCount > 0)
    .sort((a, b) => {
      if (b.packDependencyCount !== a.packDependencyCount) {
        return b.packDependencyCount - a.packDependencyCount;
      }
      return a.evId.localeCompare(b.evId);
    })
    .slice(0, TOP_LIMIT);

  const cold = nodes
    .filter((n) => (n.derived_tags ?? []).includes("COLD"))
    .map((n) => n.ev_id)
    .sort();

  return { topReferenced, topPackDependent, cold };
}

export function buildRiskReport(
  registry: Registry,
  packs: ContextPack[],
): RiskReport {
  const nodes = withEvId(registry.nodes);
  const tagsByEvId = new Map<string, DerivedTag[]>();
  for (const n of nodes) {
    tagsByEvId.set(n.ev_id, n.derived_tags ?? []);
  }

  const hasTag = (evId: string, tag: DerivedTag): boolean => {
    return (tagsByEvId.get(evId) ?? []).includes(tag);
  };

  // COLD  = structural fact: reference_count === 0 && pack_dependency_count === 0
  //         No judgment about whether this is a problem.
  //
  // ORPHAN = operational risk: COLD && status is active/draft/undefined && not superseded/archived
  //          A subset of COLD that is actionable — these nodes are reachable but forgotten.
  const orphan = nodes
    .filter((n) => {
      if (!hasTag(n.ev_id, "COLD")) return false;
      return n.status === undefined || n.status === "active";
    })
    .map((n) => n.ev_id)
    .sort();

  const stale = nodes
    .filter((n) => hasTag(n.ev_id, "STALE"))
    .map((n) => n.ev_id)
    .sort();

  const superseded = nodes
    .filter((n) => hasTag(n.ev_id, "SUPERSEDED"))
    .map((n) => n.ev_id)
    .sort();

  const cold = nodes
    .filter((n) => hasTag(n.ev_id, "COLD"))
    .map((n) => n.ev_id)
    .sort();

  const staleDependencies: StaleDependency[] = [];

  const classifyTarget = (
    targetId: string,
  ): "STALE" | "OLD" | null => {
    const tags = tagsByEvId.get(targetId);
    if (!tags) return null;
    if (tags.includes("STALE")) return "STALE";
    if (tags.includes("OLD")) return "OLD";
    return null;
  };

  // Packs: mustRead is the pack's required-reading edge.
  for (const pack of packs) {
    for (const target of pack.mustRead) {
      const tag = classifyTarget(target);
      if (tag) {
        staleDependencies.push({ source: pack.id, target, targetTag: tag });
      }
    }
  }

  // Handovers: must_read is already merged into depends_on by parseFile,
  // so iterate depends_on for handover-type nodes.
  for (const n of nodes) {
    if (!n.ev_id.startsWith("ev:handover.")) continue;
    for (const target of n.depends_on) {
      const tag = classifyTarget(target);
      if (tag) {
        staleDependencies.push({
          source: n.ev_id,
          target,
          targetTag: tag,
        });
      }
    }
  }

  staleDependencies.sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return a.target.localeCompare(b.target);
  });

  return { orphan, stale, superseded, cold, staleDependencies };
}
