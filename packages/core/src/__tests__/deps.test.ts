import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDeps, renderDepTree } from "../deps.js";
import type { DepGraph } from "@ev-lite/shared";
import type { DepSkipReason } from "@ev-lite/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_ROOT = resolve(__dirname, "fixtures", "deps");

function reasonsFor(skipped: { specifier: string; reason: DepSkipReason }[]) {
  return new Map(skipped.map((s) => [s.specifier, s.reason]));
}

describe("resolveDeps", () => {
  it("traces a simple 2-file graph (A → B)", async () => {
    const root = resolve(FIXTURE_ROOT, "simple");
    const graph = await resolveDeps("a.ts", root);
    expect(graph.files.sort()).toEqual(["a.ts", "b.ts"]);
    expect(graph.edges).toEqual([["a.ts", "b.ts"]]);
    expect(graph.skipped).toEqual([]);
  });

  it("traces a 3-level chain (A → B → C)", async () => {
    const root = resolve(FIXTURE_ROOT, "chain");
    const graph = await resolveDeps("a.ts", root);
    expect(graph.files.sort()).toEqual(["a.ts", "b.ts", "c.ts"]);
    expect(graph.edges).toContainEqual(["a.ts", "b.ts"]);
    expect(graph.edges).toContainEqual(["b.ts", "c.ts"]);
  });

  it("handles cyclic imports (A → B → A) without infinite loop", async () => {
    const root = resolve(FIXTURE_ROOT, "cycle");
    const graph = await resolveDeps("a.ts", root);
    expect(graph.files.sort()).toEqual(["a.ts", "b.ts"]);
    expect(graph.edges).toContainEqual(["a.ts", "b.ts"]);
    expect(graph.edges).toContainEqual(["b.ts", "a.ts"]);
  });

  it("supports export * from, import type, and dynamic literal imports; reports dynamic variable as skipped", async () => {
    const root = resolve(FIXTURE_ROOT, "syntax");
    const graph = await resolveDeps("entry.ts", root);
    expect(graph.files).toContain("entry.ts");
    expect(graph.files).toContain("reexport.ts");
    expect(graph.files).toContain("types-only.ts");
    expect(graph.files).toContain("dynamic-literal.ts");

    const dynVar = graph.skipped.find((s) => s.reason === "dynamic-variable");
    expect(dynVar).toBeDefined();
  });

  it("classifies node_modules, alias, missing, and unsupported-extension skips", async () => {
    const root = resolve(FIXTURE_ROOT, "skips");
    const graph = await resolveDeps("entry.ts", root);
    const reasons = reasonsFor(graph.skipped);
    expect(reasons.get("fs")).toBe("external");
    expect(reasons.get("react")).toBe("external");
    expect(reasons.get("@/lib/helper")).toBe("alias");
    expect(reasons.get("./does-not-exist")).toBe("missing");
    expect(reasons.get("./styles.css")).toBe("unsupported-extension");
    expect(reasons.get("./data.json")).toBe("unsupported-extension");
  });

  it("respects maxDepth (max-depth skip beyond the limit)", async () => {
    const root = resolve(FIXTURE_ROOT, "depth");
    const graph = await resolveDeps("a.ts", root, { maxDepth: 1 });
    expect(graph.files).toContain("a.ts");
    expect(graph.files).toContain("b.ts");
    expect(graph.files).not.toContain("c.ts");
    const maxDepthSkip = graph.skipped.find((s) => s.reason === "max-depth");
    expect(maxDepthSkip).toBeDefined();
    expect(maxDepthSkip?.specifier).toBe("./c");
  });

  it("excludes .spec.ts by default (includeTests=false)", async () => {
    const root = resolve(FIXTURE_ROOT, "tests");
    const graph = await resolveDeps("entry.ts", root);
    expect(graph.files).toContain("helper.ts");
    expect(graph.files).not.toContain("helper.spec.ts");
    const excluded = graph.skipped.find((s) => s.reason === "excluded");
    expect(excluded).toBeDefined();
    expect(excluded?.specifier).toBe("./helper.spec");
  });

  it("includes .spec.ts when includeTests=true", async () => {
    const root = resolve(FIXTURE_ROOT, "tests");
    const graph = await resolveDeps("entry.ts", root, { includeTests: true });
    expect(graph.files).toContain("helper.spec.ts");
    expect(graph.skipped.find((s) => s.reason === "excluded")).toBeUndefined();
  });

  it(".js 拡張子付き specifier が実在する .ts ファイルに解決される", async () => {
    const root = resolve(FIXTURE_ROOT, "esm-js");
    const graph = await resolveDeps("entry.ts", root);
    expect(graph.files.sort()).toEqual(["entry.ts", "parse.ts", "scan.ts"]);
    expect(graph.edges).toContainEqual(["entry.ts", "scan.ts"]);
    expect(graph.edges).toContainEqual(["entry.ts", "parse.ts"]);
    expect(graph.skipped).toEqual([]);
  });

  it("returns empty skipped for a standalone file with no imports", async () => {
    const root = resolve(FIXTURE_ROOT, "standalone");
    const graph = await resolveDeps("lonely.ts", root);
    expect(graph.files).toEqual(["lonely.ts"]);
    expect(graph.edges).toEqual([]);
    expect(graph.skipped).toEqual([]);
  });
});

describe("renderDepTree", () => {
  it("renders the root without a connector and children with ├── / └──", () => {
    const graph: DepGraph = {
      entrypoint: "a.ts",
      root: "/",
      files: ["a.ts", "b.ts", "c.ts"],
      edges: [
        ["a.ts", "b.ts"],
        ["a.ts", "c.ts"],
      ],
      skipped: [],
    };
    expect(renderDepTree(graph)).toBe(
      ["a.ts", "├── b.ts", "└── c.ts"].join("\n"),
    );
  });

  it("indents grandchildren under a │ guide for non-last branches", () => {
    const graph: DepGraph = {
      entrypoint: "a.ts",
      root: "/",
      files: ["a.ts", "b.ts", "c.ts", "d.ts"],
      edges: [
        ["a.ts", "b.ts"],
        ["b.ts", "c.ts"],
        ["a.ts", "d.ts"],
      ],
      skipped: [],
    };
    expect(renderDepTree(graph)).toBe(
      ["a.ts", "├── b.ts", "│   └── c.ts", "└── d.ts"].join("\n"),
    );
  });

  it("marks DAG re-visits as (visited) and does not expand them again", () => {
    const graph: DepGraph = {
      entrypoint: "index.ts",
      root: "/",
      files: ["index.ts", "registry.ts", "parse.ts"],
      edges: [
        ["index.ts", "parse.ts"],
        ["index.ts", "registry.ts"],
        ["registry.ts", "parse.ts"],
      ],
      skipped: [],
    };
    expect(renderDepTree(graph)).toBe(
      [
        "index.ts",
        "├── parse.ts",
        "└── registry.ts",
        "    └── parse.ts (visited)",
      ].join("\n"),
    );
  });

  it("dedupes repeated edges from the same parent", () => {
    const graph: DepGraph = {
      entrypoint: "a.ts",
      root: "/",
      files: ["a.ts", "b.ts"],
      edges: [
        ["a.ts", "b.ts"],
        ["a.ts", "b.ts"],
      ],
      skipped: [],
    };
    expect(renderDepTree(graph)).toBe(["a.ts", "└── b.ts"].join("\n"));
  });

  it("handles a cyclic graph by terminating the cycle with (visited)", () => {
    const graph: DepGraph = {
      entrypoint: "a.ts",
      root: "/",
      files: ["a.ts", "b.ts"],
      edges: [
        ["a.ts", "b.ts"],
        ["b.ts", "a.ts"],
      ],
      skipped: [],
    };
    expect(renderDepTree(graph)).toBe(
      ["a.ts", "└── b.ts", "    └── a.ts (visited)"].join("\n"),
    );
  });
});
