import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import { deriveTags } from "../deriveTags.js";
import { scanRepo } from "../scan.js";
import type { EvidenceNode } from "@ev-lite/shared";

const NOW = new Date("2026-05-29T00:00:00.000Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysAgoIso(days: number): string {
  return new Date(NOW.getTime() - days * MS_PER_DAY).toISOString();
}

function baseNode(overrides: Partial<EvidenceNode> = {}): EvidenceNode {
  return {
    ev_id: "ev:test.x",
    kind: "file",
    path: "x.md",
    tags: [],
    depends_on: [],
    related: [],
    supersedes: [],
    ...overrides,
  };
}

describe("deriveTags", () => {
  it("updated_at 10 days ago → NEW + ACTIVE", () => {
    const tags = deriveTags(
      baseNode({ updated_at: daysAgoIso(10), status: "active" }),
      { now: NOW },
    );
    expect(tags).toContain("NEW");
    expect(tags).toContain("ACTIVE");
    expect(tags).not.toContain("RECENT");
    expect(tags).not.toContain("OLD");
  });

  it("updated_at 60 days ago → RECENT + ACTIVE", () => {
    const tags = deriveTags(
      baseNode({ updated_at: daysAgoIso(60), status: "active" }),
      { now: NOW },
    );
    expect(tags).toContain("RECENT");
    expect(tags).toContain("ACTIVE");
    expect(tags).not.toContain("NEW");
    expect(tags).not.toContain("OLD");
  });

  it("updated_at 400 days ago → OLD + ACTIVE", () => {
    const tags = deriveTags(
      baseNode({ updated_at: daysAgoIso(400), status: "active" }),
      { now: NOW },
    );
    expect(tags).toContain("OLD");
    expect(tags).toContain("ACTIVE");
    expect(tags).not.toContain("NEW");
    expect(tags).not.toContain("RECENT");
  });

  it("status: stale → STALE", () => {
    const tags = deriveTags(baseNode({ status: "stale" }), { now: NOW });
    expect(tags).toContain("STALE");
  });

  it("status: superseded → SUPERSEDED", () => {
    const tags = deriveTags(baseNode({ status: "superseded" }), { now: NOW });
    expect(tags).toContain("SUPERSEDED");
  });

  it("effectivelySuperseded → SUPERSEDED even without explicit status", () => {
    const tags = deriveTags(baseNode({ status: "active" }), {
      now: NOW,
      effectivelySuperseded: true,
    });
    expect(tags).toContain("SUPERSEDED");
    expect(tags).toContain("ACTIVE");
  });

  it("no updated_at and no created_at → no Freshness tags", () => {
    const tags = deriveTags(baseNode({ status: "active" }), { now: NOW });
    expect(tags).not.toContain("NEW");
    expect(tags).not.toContain("RECENT");
    expect(tags).not.toContain("OLD");
    expect(tags).toContain("ACTIVE");
  });

  it("falls back to created_at when updated_at is missing", () => {
    const tags = deriveTags(
      baseNode({ created_at: daysAgoIso(10), status: "active" }),
      { now: NOW },
    );
    expect(tags).toContain("NEW");
  });

  it("invalid ISO date → silent skip (no Freshness tags)", () => {
    const tags = deriveTags(
      baseNode({ updated_at: "not-a-date", status: "active" }),
      { now: NOW },
    );
    expect(tags).not.toContain("NEW");
    expect(tags).not.toContain("RECENT");
    expect(tags).not.toContain("OLD");
  });

  it("importance.reference_count >= 10 + OLD → CORE + FOUNDATIONAL", () => {
    const tags = deriveTags(
      baseNode({
        updated_at: daysAgoIso(400),
        status: "active",
        importance: { reference_count: 10 },
      }),
      { now: NOW },
    );
    expect(tags).toContain("OLD");
    expect(tags).toContain("CORE");
    expect(tags).toContain("FOUNDATIONAL");
  });

  it("reference_count >= 10 but not OLD → CORE only (no FOUNDATIONAL)", () => {
    const tags = deriveTags(
      baseNode({
        updated_at: daysAgoIso(60),
        status: "active",
        importance: { reference_count: 15 },
      }),
      { now: NOW },
    );
    expect(tags).toContain("CORE");
    expect(tags).not.toContain("FOUNDATIONAL");
  });

  it("no importance → no usage tags", () => {
    const tags = deriveTags(
      baseNode({ updated_at: daysAgoIso(10), status: "active" }),
      { now: NOW },
    );
    expect(tags).not.toContain("CORE");
    expect(tags).not.toContain("FOUNDATIONAL");
  });
});

describe("scanRepo: derived_tags integration", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "ev-derive-"));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it("attaches derived_tags to each node in registry.json", async () => {
    const md = [
      "---",
      "ev_id: ev:doc.fresh",
      "status: active",
      `updated_at: ${daysAgoIso(5)}`,
      "tags: [a, b]",
      "depends_on: []",
      "related: []",
      "supersedes: []",
      "---",
      "",
      "# Fresh",
    ].join("\n");
    await fs.writeFile(path.join(root, "fresh.md"), md, "utf8");

    const registry = await scanRepo(root);
    const node = registry.nodes.find((n) => n.ev_id === "ev:doc.fresh");
    expect(node).toBeDefined();
    expect(node?.derived_tags).toEqual(
      expect.arrayContaining(["NEW", "ACTIVE"]),
    );
  });

  it("assigns SUPERSEDED to a node listed in another node's supersedes", async () => {
    const older = [
      "---",
      "ev_id: ev:doc.old",
      "status: active",
      "depends_on: []",
      "related: []",
      "supersedes: []",
      "---",
      "",
    ].join("\n");
    const newer = [
      "---",
      "ev_id: ev:doc.new",
      "status: active",
      "depends_on: []",
      "related: []",
      "supersedes:",
      "  - ev:doc.old",
      "---",
      "",
    ].join("\n");
    await fs.writeFile(path.join(root, "old.md"), older, "utf8");
    await fs.writeFile(path.join(root, "new.md"), newer, "utf8");

    const registry = await scanRepo(root);
    const oldNode = registry.nodes.find((n) => n.ev_id === "ev:doc.old");
    const newNode = registry.nodes.find((n) => n.ev_id === "ev:doc.new");
    expect(oldNode?.derived_tags).toContain("SUPERSEDED");
    expect(oldNode?.derived_tags).toContain("ACTIVE");
    expect(newNode?.derived_tags).not.toContain("SUPERSEDED");
  });

  it("does not write derived_tags back to the source markdown", async () => {
    const md = [
      "---",
      "ev_id: ev:doc.untouched",
      "status: active",
      `updated_at: ${daysAgoIso(5)}`,
      "depends_on: []",
      "related: []",
      "supersedes: []",
      "---",
      "",
      "# Untouched",
    ].join("\n");
    const filePath = path.join(root, "untouched.md");
    await fs.writeFile(filePath, md, "utf8");
    const before = await fs.readFile(filePath, "utf8");

    await scanRepo(root);

    const after = await fs.readFile(filePath, "utf8");
    expect(after).toEqual(before);
    expect(after).not.toContain("derived_tags");
  });
});
