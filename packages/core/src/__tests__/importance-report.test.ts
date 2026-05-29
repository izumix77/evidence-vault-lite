import { describe, it, expect } from "vitest";
import {
  buildImportanceReport,
  buildRiskReport,
} from "../importance-report.js";
import type { ContextPack, EvidenceNode } from "@ev-lite/shared";
import type { Registry } from "../registry.js";

function node(overrides: Partial<EvidenceNode> & { ev_id: string }): EvidenceNode {
  return {
    ev_id: overrides.ev_id,
    kind: "file",
    path: `${overrides.ev_id}.md`,
    tags: [],
    depends_on: [],
    related: [],
    supersedes: [],
    ...overrides,
  };
}

function registry(nodes: EvidenceNode[]): Registry {
  return {
    generated_at: "2026-05-29T00:00:00.000Z",
    root: "/tmp/test",
    nodes,
  };
}

function pack(overrides: Partial<ContextPack> & { id: string }): ContextPack {
  return {
    id: overrides.id,
    goal: "",
    mustRead: [],
    doNotInfer: [],
    outputGoal: [],
    ...overrides,
  };
}

describe("buildImportanceReport", () => {
  it("sorts TOP REFERENCED by reference_count desc, with name tiebreak", () => {
    const reg = registry([
      node({
        ev_id: "ev:a.low",
        importance: { reference_count: 2, pack_dependency_count: 0 },
        derived_tags: [],
      }),
      node({
        ev_id: "ev:b.high",
        importance: { reference_count: 24, pack_dependency_count: 8 },
        derived_tags: ["CORE", "FOUNDATIONAL"],
      }),
      node({
        ev_id: "ev:c.mid",
        importance: { reference_count: 9, pack_dependency_count: 3 },
        derived_tags: ["HOT"],
      }),
    ]);
    const report = buildImportanceReport(reg);
    expect(report.topReferenced.map((r) => r.evId)).toEqual([
      "ev:b.high",
      "ev:c.mid",
      "ev:a.low",
    ]);
    expect(report.topReferenced[0].usageTags).toEqual([
      "CORE",
      "FOUNDATIONAL",
    ]);
  });

  it("caps TOP REFERENCED at 10 rows", () => {
    const nodes: EvidenceNode[] = [];
    for (let i = 0; i < 15; i++) {
      nodes.push(
        node({
          ev_id: `ev:t.${String(i).padStart(2, "0")}`,
          importance: { reference_count: i + 1, pack_dependency_count: 0 },
        }),
      );
    }
    const report = buildImportanceReport(registry(nodes));
    expect(report.topReferenced).toHaveLength(10);
    expect(report.topReferenced[0].referenceCount).toBe(15);
  });

  it("MOST PACK-DEPENDENT sorts by pack_dependency_count desc", () => {
    const reg = registry([
      node({
        ev_id: "ev:a",
        importance: { pack_dependency_count: 1, reference_count: 0 },
      }),
      node({
        ev_id: "ev:b",
        importance: { pack_dependency_count: 8, reference_count: 0 },
      }),
      node({
        ev_id: "ev:c",
        importance: { pack_dependency_count: 4, reference_count: 0 },
      }),
    ]);
    const report = buildImportanceReport(reg);
    expect(report.topPackDependent.map((r) => r.evId)).toEqual([
      "ev:b",
      "ev:c",
      "ev:a",
    ]);
  });

  it("COLD lists every node tagged COLD", () => {
    const reg = registry([
      node({ ev_id: "ev:cold-1", derived_tags: ["COLD"] }),
      node({ ev_id: "ev:cold-2", derived_tags: ["COLD"] }),
      node({ ev_id: "ev:hot", derived_tags: ["CORE"] }),
    ]);
    const report = buildImportanceReport(reg);
    expect(report.cold).toEqual(["ev:cold-1", "ev:cold-2"]);
  });

  it("excludes nodes with ev_id === null", () => {
    const reg = registry([
      node({
        ev_id: "ev:visible",
        importance: { reference_count: 5, pack_dependency_count: 0 },
      }),
      { ...node({ ev_id: "placeholder" }), ev_id: null },
    ]);
    const report = buildImportanceReport(reg);
    expect(report.topReferenced.map((r) => r.evId)).toEqual(["ev:visible"]);
  });
});

describe("buildRiskReport", () => {
  it("ORPHAN includes COLD nodes that are active or status-less", () => {
    const reg = registry([
      node({
        ev_id: "ev:orphan-active",
        status: "active",
        derived_tags: ["COLD", "ACTIVE"],
      }),
      node({
        ev_id: "ev:orphan-unset",
        derived_tags: ["COLD"],
      }),
      node({
        ev_id: "ev:archived-cold",
        status: "archived",
        derived_tags: ["COLD", "ARCHIVED"],
      }),
      node({
        ev_id: "ev:not-cold",
        status: "active",
        derived_tags: ["ACTIVE"],
      }),
    ]);
    const report = buildRiskReport(reg, []);
    expect(report.orphan).toEqual([
      "ev:orphan-active",
      "ev:orphan-unset",
    ]);
  });

  it("STALE / SUPERSEDED / COLD groups are populated from derived_tags", () => {
    const reg = registry([
      node({ ev_id: "ev:s1", status: "stale", derived_tags: ["STALE"] }),
      node({
        ev_id: "ev:sup1",
        status: "superseded",
        derived_tags: ["SUPERSEDED"],
      }),
      node({
        ev_id: "ev:sup2",
        status: "active",
        derived_tags: ["SUPERSEDED", "ACTIVE"],
      }),
      node({
        ev_id: "ev:cold1",
        status: "active",
        derived_tags: ["COLD", "ACTIVE"],
      }),
    ]);
    const report = buildRiskReport(reg, []);
    expect(report.stale).toEqual(["ev:s1"]);
    expect(report.superseded).toEqual(["ev:sup1", "ev:sup2"]);
    expect(report.cold).toEqual(["ev:cold1"]);
  });

  it("detects STALE DEPENDENCY: pack.mustRead targeting STALE/OLD nodes", () => {
    const reg = registry([
      node({ ev_id: "ev:t.stale", derived_tags: ["STALE"] }),
      node({ ev_id: "ev:t.old", derived_tags: ["OLD"] }),
      node({ ev_id: "ev:t.fresh", derived_tags: ["NEW"] }),
    ]);
    const packs = [
      pack({
        id: "pack:impl-phase1",
        mustRead: ["ev:t.stale", "ev:t.fresh"],
      }),
      pack({ id: "pack:legacy", mustRead: ["ev:t.old"] }),
    ];
    const report = buildRiskReport(reg, packs);
    expect(report.staleDependencies).toEqual([
      { source: "pack:impl-phase1", target: "ev:t.stale", targetTag: "STALE" },
      { source: "pack:legacy", target: "ev:t.old", targetTag: "OLD" },
    ]);
  });

  it("detects STALE DEPENDENCY: handover.must_read (merged into depends_on)", () => {
    const reg = registry([
      node({ ev_id: "ev:t.stale", derived_tags: ["STALE"] }),
      node({
        ev_id: "ev:handover.session-1",
        path: "session-1.handover.md",
        // parseFile merges must_read into depends_on for handover types
        depends_on: ["ev:t.stale"],
        derived_tags: ["ACTIVE"],
      }),
    ]);
    const report = buildRiskReport(reg, []);
    expect(report.staleDependencies).toEqual([
      {
        source: "ev:handover.session-1",
        target: "ev:t.stale",
        targetTag: "STALE",
      },
    ]);
  });

  it("omits categories that are empty (caller decides whether to print)", () => {
    const reg = registry([
      node({ ev_id: "ev:fine", status: "active", derived_tags: ["ACTIVE"] }),
    ]);
    const report = buildRiskReport(reg, []);
    expect(report.orphan).toEqual([]);
    expect(report.stale).toEqual([]);
    expect(report.superseded).toEqual([]);
    expect(report.cold).toEqual([]);
    expect(report.staleDependencies).toEqual([]);
  });
});
