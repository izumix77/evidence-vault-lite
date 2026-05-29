import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import { HandoverReportSchema } from "@ev-lite/shared";
import { scanRepo } from "../scan.js";

describe("HandoverReportSchema", () => {
  const validBase = {
    id: "ev:handover.session-1",
    type: "handover" as const,
    title: "Session 1 handover",
    created_at: "2026-05-29T00:00:00.000Z",
    goal: "Continue auth refactor",
    current_state: "Middleware extracted; tests pending",
    next_actions: ["finish unit tests", "open PR"],
    must_read: ["ev:auth.middleware", "ev:auth.session"],
    status: "active" as const,
  };

  it("accepts a minimal valid handover", () => {
    const result = HandoverReportSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("defaults missing must_read / next_actions to empty arrays", () => {
    const { must_read, next_actions, ...rest } = validBase;
    void must_read;
    void next_actions;
    const result = HandoverReportSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.must_read).toEqual([]);
      expect(result.data.next_actions).toEqual([]);
    }
  });

  it("rejects when type is not 'handover'", () => {
    const result = HandoverReportSchema.safeParse({
      ...validBase,
      type: "report",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when required field (goal) is missing", () => {
    const { goal, ...rest } = validBase;
    void goal;
    const result = HandoverReportSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when status is not an EvidenceStatus", () => {
    const result = HandoverReportSchema.safeParse({
      ...validBase,
      status: "in-progress",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields and metadata block", () => {
    const result = HandoverReportSchema.safeParse({
      ...validBase,
      optional_read: ["ev:notes.tradeoffs"],
      active_decisions: ["use JWT"],
      unresolved_questions: ["refresh window?"],
      known_risks: ["downstream lockout"],
      related_packs: ["pack:auth-handover"],
      related_docs: ["ev:auth.spec"],
      supersedes: ["ev:handover.session-0"],
      superseded_by: [],
      tags: ["auth", "handover"],
      metadata: {
        reference_count: 3,
        last_referenced_at: "2026-05-30T00:00:00.000Z",
        generated_by: "evlite",
        generated_at: "2026-05-29T00:00:00.000Z",
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("scanRepo: handover frontmatter", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "ev-handover-"));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it("registers a type: handover file as an EvidenceNode and maps must_read → depends_on", async () => {
    const md = [
      "---",
      "ev_id: ev:handover.session-1",
      "type: handover",
      "title: Session 1",
      "status: active",
      "created_at: 2026-05-29T00:00:00.000Z",
      "goal: continue auth work",
      "current_state: tests pending",
      "next_actions:",
      "  - finish tests",
      "must_read:",
      "  - ev:auth.middleware",
      "  - ev:auth.session",
      "supersedes:",
      "  - ev:handover.session-0",
      "tags: [handover, auth]",
      "---",
      "",
      "# Session 1 handover",
      "",
    ].join("\n");
    await fs.writeFile(path.join(root, "session-1.handover.md"), md, "utf8");

    const registry = await scanRepo(root);
    const node = registry.nodes.find(
      (n) => n.ev_id === "ev:handover.session-1",
    );

    expect(node).toBeDefined();
    expect(node?.kind).toBe("file");
    expect(node?.depends_on).toEqual([
      "ev:auth.middleware",
      "ev:auth.session",
    ]);
    expect(node?.supersedes).toEqual(["ev:handover.session-0"]);
    expect(node?.tags).toEqual(["handover", "auth"]);
    expect(node?.status).toBe("active");
  });

  it("merges must_read with any explicit depends_on without duplicates", async () => {
    const md = [
      "---",
      "ev_id: ev:handover.dual",
      "type: handover",
      "title: Dual deps",
      "status: draft",
      "created_at: 2026-05-29T00:00:00.000Z",
      "goal: noop",
      "current_state: noop",
      "must_read:",
      "  - ev:a",
      "  - ev:b",
      "depends_on:",
      "  - ev:b",
      "  - ev:c",
      "---",
      "",
    ].join("\n");
    await fs.writeFile(path.join(root, "dual.handover.md"), md, "utf8");

    const registry = await scanRepo(root);
    const node = registry.nodes.find((n) => n.ev_id === "ev:handover.dual");

    expect(node).toBeDefined();
    expect(node?.depends_on).toEqual(["ev:a", "ev:b", "ev:c"]);
  });

  it("leaves depends_on alone for non-handover files even when must_read is present", async () => {
    const md = [
      "---",
      "ev_id: ev:doc.note",
      "type: report",
      "title: note",
      "status: active",
      "must_read:",
      "  - ev:should-be-ignored",
      "depends_on:",
      "  - ev:real",
      "---",
      "",
    ].join("\n");
    await fs.writeFile(path.join(root, "note.md"), md, "utf8");

    const registry = await scanRepo(root);
    const node = registry.nodes.find((n) => n.ev_id === "ev:doc.note");

    expect(node).toBeDefined();
    expect(node?.depends_on).toEqual(["ev:real"]);
  });
});
