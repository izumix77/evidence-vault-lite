import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import { scanRepo } from "../scan.js";

async function writeMarkdown(
  root: string,
  rel: string,
  content: string,
): Promise<void> {
  const full = path.join(root, rel);
  await fs.ensureDir(path.dirname(full));
  await fs.writeFile(full, content, "utf8");
}

async function writePack(
  root: string,
  packBasename: string,
  pack: Record<string, unknown>,
): Promise<void> {
  const full = path.join(root, ".ev-lite", "packs", `${packBasename}.json`);
  await fs.ensureDir(path.dirname(full));
  await fs.writeJson(full, pack, { spaces: 2 });
}

function fm(lines: string[]): string {
  return ["---", ...lines, "---", "", ""].join("\n");
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TODAY = new Date();
const daysAgoIso = (days: number) =>
  new Date(TODAY.getTime() - days * MS_PER_DAY).toISOString();

describe("scanRepo: importance aggregation", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "ev-importance-"));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it("counts depends_on references from other nodes into reference_count", async () => {
    await writeMarkdown(
      root,
      "target.md",
      fm(["ev_id: ev:t.target", "status: active"]),
    );
    for (const n of ["a", "b", "c"]) {
      await writeMarkdown(
        root,
        `${n}.md`,
        fm([
          `ev_id: ev:t.${n}`,
          "status: active",
          "depends_on:",
          "  - ev:t.target",
        ]),
      );
    }
    const registry = await scanRepo(root);
    const target = registry.nodes.find((n) => n.ev_id === "ev:t.target");
    expect(target?.importance?.reference_count).toBe(3);
    expect(target?.importance?.pack_dependency_count).toBe(0);
  });

  it("counts pack.json mustRead into pack_dependency_count and reference_count", async () => {
    await writeMarkdown(
      root,
      "t.md",
      fm(["ev_id: ev:t.target", "status: active"]),
    );
    await writePack(root, "demo", {
      id: "pack:demo",
      goal: "test",
      mustRead: ["ev:t.target"],
      doNotInfer: [],
      outputGoal: [],
    });
    const registry = await scanRepo(root);
    const target = registry.nodes.find((n) => n.ev_id === "ev:t.target");
    expect(target?.importance?.pack_dependency_count).toBe(1);
    expect(target?.importance?.reference_count).toBe(1);
  });

  it("pack.related contributes to reference_count but not pack_dependency_count", async () => {
    await writeMarkdown(
      root,
      "t.md",
      fm(["ev_id: ev:t.target", "status: active"]),
    );
    await writePack(root, "demo", {
      id: "pack:demo",
      goal: "test",
      mustRead: [],
      doNotInfer: [],
      outputGoal: [],
      related: ["ev:t.target"],
    });
    const registry = await scanRepo(root);
    const target = registry.nodes.find((n) => n.ev_id === "ev:t.target");
    expect(target?.importance?.reference_count).toBe(1);
    expect(target?.importance?.pack_dependency_count).toBe(0);
  });

  it("reference_count >= 10 attaches CORE", async () => {
    await writeMarkdown(
      root,
      "target.md",
      fm(["ev_id: ev:t.target", "status: active"]),
    );
    for (let i = 0; i < 10; i++) {
      await writeMarkdown(
        root,
        `ref-${i}.md`,
        fm([
          `ev_id: ev:t.ref-${i}`,
          "status: active",
          "depends_on:",
          "  - ev:t.target",
        ]),
      );
    }
    const registry = await scanRepo(root);
    const target = registry.nodes.find((n) => n.ev_id === "ev:t.target");
    expect(target?.importance?.reference_count).toBe(10);
    expect(target?.derived_tags).toContain("CORE");
  });

  it("reference_count >= 10 + OLD attaches FOUNDATIONAL", async () => {
    await writeMarkdown(
      root,
      "target.md",
      fm([
        "ev_id: ev:t.target",
        "status: active",
        `updated_at: ${daysAgoIso(400)}`,
      ]),
    );
    for (let i = 0; i < 10; i++) {
      await writeMarkdown(
        root,
        `ref-${i}.md`,
        fm([
          `ev_id: ev:t.ref-${i}`,
          "status: active",
          "depends_on:",
          "  - ev:t.target",
        ]),
      );
    }
    const registry = await scanRepo(root);
    const target = registry.nodes.find((n) => n.ev_id === "ev:t.target");
    expect(target?.derived_tags).toContain("FOUNDATIONAL");
    expect(target?.derived_tags).toContain("OLD");
  });

  it("pack_dependency_count >= 3 attaches HOT", async () => {
    await writeMarkdown(
      root,
      "t.md",
      fm(["ev_id: ev:t.target", "status: active"]),
    );
    for (const n of ["a", "b", "c"]) {
      await writePack(root, n, {
        id: `pack:${n}`,
        goal: "test",
        mustRead: ["ev:t.target"],
        doNotInfer: [],
        outputGoal: [],
      });
    }
    const registry = await scanRepo(root);
    const target = registry.nodes.find((n) => n.ev_id === "ev:t.target");
    expect(target?.importance?.pack_dependency_count).toBe(3);
    expect(target?.derived_tags).toContain("HOT");
  });

  it("reference_count === 0 && pack_dependency_count === 0 attaches COLD", async () => {
    await writeMarkdown(
      root,
      "lonely.md",
      fm(["ev_id: ev:t.lonely", "status: active"]),
    );
    const registry = await scanRepo(root);
    const lonely = registry.nodes.find((n) => n.ev_id === "ev:t.lonely");
    expect(lonely?.importance?.reference_count).toBe(0);
    expect(lonely?.importance?.pack_dependency_count).toBe(0);
    expect(lonely?.derived_tags).toContain("COLD");
  });

  it("explicit_priority from frontmatter is preserved and not overwritten by scan", async () => {
    await writeMarkdown(
      root,
      "priority.md",
      fm([
        "ev_id: ev:t.priority",
        "status: active",
        "importance:",
        "  explicit_priority: 0.8",
      ]),
    );
    const registry = await scanRepo(root);
    const node = registry.nodes.find((n) => n.ev_id === "ev:t.priority");
    expect(node?.importance?.explicit_priority).toBe(0.8);
    // aggregation still fills in counts alongside the preserved priority
    expect(node?.importance?.reference_count).toBe(0);
    expect(node?.importance?.pack_dependency_count).toBe(0);
  });

  it("handover.must_read counts as reference (via depends_on merge in parseFile)", async () => {
    await writeMarkdown(
      root,
      "target.md",
      fm(["ev_id: ev:t.target", "status: active"]),
    );
    await writeMarkdown(
      root,
      "hand.handover.md",
      fm([
        "ev_id: ev:handover.session-1",
        "type: handover",
        "title: Session 1",
        "status: active",
        "created_at: 2026-01-01",
        "goal: continue",
        "current_state: ok",
        "must_read:",
        "  - ev:t.target",
      ]),
    );
    const registry = await scanRepo(root);
    const target = registry.nodes.find((n) => n.ev_id === "ev:t.target");
    expect(target?.importance?.reference_count).toBe(1);
  });

  it("handover.optional_read counts as reference (separately from must_read)", async () => {
    await writeMarkdown(
      root,
      "extra.md",
      fm(["ev_id: ev:t.extra", "status: active"]),
    );
    await writeMarkdown(
      root,
      "hand.handover.md",
      fm([
        "ev_id: ev:handover.session-2",
        "type: handover",
        "title: Session 2",
        "status: active",
        "created_at: 2026-01-01",
        "goal: continue",
        "current_state: ok",
        "optional_read:",
        "  - ev:t.extra",
      ]),
    );
    const registry = await scanRepo(root);
    const extra = registry.nodes.find((n) => n.ev_id === "ev:t.extra");
    expect(extra?.importance?.reference_count).toBe(1);
  });

  it("malformed pack.json is silently skipped (does not throw)", async () => {
    await writeMarkdown(
      root,
      "t.md",
      fm(["ev_id: ev:t.target", "status: active"]),
    );
    await fs.ensureDir(path.join(root, ".ev-lite", "packs"));
    await fs.writeFile(
      path.join(root, ".ev-lite", "packs", "broken.json"),
      "{ this is not valid JSON",
      "utf8",
    );
    await expect(scanRepo(root)).resolves.toBeDefined();
  });

  it("does not write importance back to the source markdown", async () => {
    const filePath = path.join(root, "untouched.md");
    await writeMarkdown(
      root,
      "untouched.md",
      fm(["ev_id: ev:t.untouched", "status: active"]),
    );
    const before = await fs.readFile(filePath, "utf8");
    await scanRepo(root);
    const after = await fs.readFile(filePath, "utf8");
    expect(after).toEqual(before);
    expect(after).not.toContain("importance:");
  });
});
