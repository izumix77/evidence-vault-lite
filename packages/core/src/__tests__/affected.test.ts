import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import { findAffected } from "../affected.js";

type SnapshotSpec = { evId: string; name: string; body: string };
type PackSpec = { id: string; mustRead: string[] };

async function setupRepo(opts: {
  snapshots: SnapshotSpec[];
  packs: PackSpec[];
  extraNodes?: { ev_id: string | null; path: string; tags: string[] }[];
}): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ev-affected-"));
  const evLite = path.join(root, ".ev-lite");
  await fs.ensureDir(path.join(evLite, "snapshots"));
  await fs.ensureDir(path.join(evLite, "packs"));

  const nodes: Array<{
    ev_id: string | null;
    kind: "file";
    path: string;
    tags: string[];
    depends_on: string[];
    related: string[];
    supersedes: string[];
  }> = [];

  for (const snap of opts.snapshots) {
    const rel = `.ev-lite/snapshots/${snap.name}.md`;
    const full = path.join(root, rel);
    const md = [
      "---",
      `ev_id: ${snap.evId}`,
      "stack: test",
      "status: active",
      "tags: [snapshot, code]",
      "depends_on: []",
      "related: []",
      "supersedes: []",
      "---",
      "",
      snap.body,
    ].join("\n");
    await fs.writeFile(full, md, "utf8");

    nodes.push({
      ev_id: snap.evId,
      kind: "file",
      path: rel,
      tags: ["snapshot", "code"],
      depends_on: [],
      related: [],
      supersedes: [],
    });
  }

  for (const extra of opts.extraNodes ?? []) {
    nodes.push({
      ev_id: extra.ev_id,
      kind: "file",
      path: extra.path,
      tags: extra.tags,
      depends_on: [],
      related: [],
      supersedes: [],
    });
  }

  await fs.writeJson(path.join(evLite, "registry.json"), {
    generated_at: new Date().toISOString(),
    root,
    nodes,
  });

  for (const p of opts.packs) {
    const basename = p.id.startsWith("pack:") ? p.id.slice(5) : p.id;
    await fs.writeJson(path.join(evLite, "packs", `${basename}.json`), {
      id: p.id,
      goal: "test",
      mustRead: p.mustRead,
      doNotInfer: [],
      outputGoal: [],
      status: "active",
    });
  }

  return root;
}

let repos: string[] = [];

async function makeRepo(...args: Parameters<typeof setupRepo>) {
  const r = await setupRepo(...args);
  repos.push(r);
  return r;
}

beforeEach(() => {
  repos = [];
});

afterEach(async () => {
  for (const r of repos) {
    await fs.remove(r);
  }
});

describe("findAffected", () => {
  it("detects a snapshot that contains the file", async () => {
    const root = await makeRepo({
      snapshots: [
        {
          evId: "ev:test.snapshot-index",
          name: "index",
          body: "## packages/core/src/snapshot.ts\n```ts\n// content\n```",
        },
      ],
      packs: [],
    });
    const result = await findAffected("packages/core/src/snapshot.ts", root);
    expect(result.affectedSnapshots).toEqual([
      { evId: "ev:test.snapshot-index", path: ".ev-lite/snapshots/index.md" },
    ]);
    expect(result.summary.snapshotCount).toBe(1);
  });

  it("skips snapshots that don't contain the file", async () => {
    const root = await makeRepo({
      snapshots: [
        {
          evId: "ev:test.snapshot-other",
          name: "other",
          body: "## packages/cli/src/index.ts\n```ts\n```",
        },
      ],
      packs: [],
    });
    const result = await findAffected("packages/core/src/snapshot.ts", root);
    expect(result.affectedSnapshots).toEqual([]);
    expect(result.summary.snapshotCount).toBe(0);
  });

  it("enumerates packs whose mustRead contains an affected snapshot", async () => {
    const root = await makeRepo({
      snapshots: [
        {
          evId: "ev:test.snapshot-index",
          name: "index",
          body: "## packages/core/src/snapshot.ts\n",
        },
      ],
      packs: [
        { id: "pack:hit", mustRead: ["ev:test.snapshot-index"] },
        { id: "pack:other", mustRead: ["ev:something-else"] },
      ],
    });
    const result = await findAffected("packages/core/src/snapshot.ts", root);
    expect(result.affectedPacks).toHaveLength(1);
    expect(result.affectedPacks[0]).toEqual({
      packId: "pack:hit",
      path: ".ev-lite/packs/hit.json",
      viaEvId: "ev:test.snapshot-index",
    });
    expect(result.summary.packCount).toBe(1);
  });

  it("returns empty arrays when no snapshot matches", async () => {
    const root = await makeRepo({
      snapshots: [
        {
          evId: "ev:test.snapshot-unrelated",
          name: "unrelated",
          body: "## packages/server/src/app.ts\n",
        },
      ],
      packs: [{ id: "pack:p", mustRead: ["ev:test.snapshot-unrelated"] }],
    });
    const result = await findAffected("packages/core/src/missing.ts", root);
    expect(result.affectedSnapshots).toEqual([]);
    expect(result.affectedPacks).toEqual([]);
    expect(result.summary).toEqual({ snapshotCount: 0, packCount: 0 });
  });

  it("normalizes Windows backslash paths in the query", async () => {
    const root = await makeRepo({
      snapshots: [
        {
          evId: "ev:test.snapshot-index",
          name: "index",
          body: "## packages/core/src/snapshot.ts\n",
        },
      ],
      packs: [],
    });
    const result = await findAffected(
      "packages\\core\\src\\snapshot.ts",
      root,
    );
    expect(result.affectedSnapshots).toHaveLength(1);
    expect(result.file).toBe("packages/core/src/snapshot.ts");
  });

  it("ignores nodes whose tags do not include 'snapshot'", async () => {
    const root = await makeRepo({
      snapshots: [],
      packs: [],
      extraNodes: [
        {
          ev_id: "ev:test.doc",
          path: "docs/has-the-path.md",
          tags: ["doc"],
        },
      ],
    });
    await fs.ensureDir(path.join(root, "docs"));
    await fs.writeFile(
      path.join(root, "docs/has-the-path.md"),
      "---\nev_id: ev:test.doc\n---\n# title\npackages/core/src/snapshot.ts\n",
    );
    const result = await findAffected("packages/core/src/snapshot.ts", root);
    expect(result.affectedSnapshots).toEqual([]);
  });

  it("documents the partial-match limitation (substring hit on a longer filename)", async () => {
    const root = await makeRepo({
      snapshots: [
        {
          evId: "ev:test.snapshot-index",
          name: "index",
          body: "## packages/core/src/snapshot.ts\n",
        },
      ],
      packs: [],
    });
    // querying "snap.ts" partially matches "snapshot.ts" — known v0.1 limitation
    const result = await findAffected("snap.ts", root);
    expect(result.affectedSnapshots).toHaveLength(0);
    // …but querying just "snapshot.ts" (a true substring) DOES hit:
    const broader = await findAffected("snapshot.ts", root);
    expect(broader.affectedSnapshots).toHaveLength(1);
  });

  it("falls back to scanning .ev-lite/snapshots when the registry node has no resolvable path", async () => {
    const root = await makeRepo({
      snapshots: [
        {
          evId: "ev:test.snapshot-fallback",
          name: "fallback",
          body: "## packages/core/src/snapshot.ts\n",
        },
      ],
      packs: [],
    });
    // Corrupt the registry: replace node.path with a bogus one to force fallback
    const regPath = path.join(root, ".ev-lite", "registry.json");
    const reg = await fs.readJson(regPath);
    for (const n of reg.nodes) {
      if (n.tags?.includes("snapshot")) n.path = "does/not/exist.md";
    }
    await fs.writeJson(regPath, reg);

    const result = await findAffected("packages/core/src/snapshot.ts", root);
    expect(result.affectedSnapshots).toHaveLength(1);
    expect(result.affectedSnapshots[0].evId).toBe("ev:test.snapshot-fallback");
  });
});
