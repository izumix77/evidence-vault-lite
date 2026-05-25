// deps mode is a reachability snapshot, not a glob snapshot.
// Only files reachable from the entrypoint through supported static relative imports are included.
// Skipped imports MUST be reported, not silently ignored.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, relative, extname } from "node:path";
import type { DepGraph, DepSkip, DepSkipReason } from "@ev-lite/shared";

export interface ResolveDepsOptions {
  maxDepth?: number;
  includeTests?: boolean;
}

const SUPPORTED_EXTS = [".ts", ".tsx", ".js", ".jsx"] as const;
const TEST_PATTERN = /\.(spec|test)\.[tj]sx?$/;

const STATIC_IMPORT_RE =
  /(?:import|export)(?:\s+type)?\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_LITERAL_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const DYNAMIC_VARIABLE_RE = /\bimport\s*\(\s*(?!['"])[^)]+\)/g;

function extractSpecifiers(
  filePath: string,
): { specifiers: string[]; dynamicVariables: string[] } {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return { specifiers: [], dynamicVariables: [] };
  }

  const specifiers: string[] = [];
  const dynamicVariables: string[] = [];

  for (const match of content.matchAll(STATIC_IMPORT_RE)) {
    specifiers.push(match[1]);
  }
  for (const match of content.matchAll(DYNAMIC_LITERAL_RE)) {
    specifiers.push(match[1]);
  }
  for (const match of content.matchAll(DYNAMIC_VARIABLE_RE)) {
    dynamicVariables.push(match[0].trim());
  }

  return { specifiers, dynamicVariables };
}

function resolveSpecifier(specifier: string, fromFile: string): string | null {
  const dir = dirname(fromFile);
  const base = resolve(dir, specifier);

  // 拡張子あり
  if (SUPPORTED_EXTS.includes(extname(base) as (typeof SUPPORTED_EXTS)[number])) {
    if (existsSync(base)) return base;
    if (extname(base) !== ".js") return null;
  }
  // .js 付き specifier → .ts / .tsx にも fallback（TypeScript ESM 対応）
  if (extname(base) === ".js") {
    const tsPath = base.replace(/\.js$/, ".ts");
    const tsxPath = base.replace(/\.js$/, ".tsx");
    if (existsSync(tsPath)) return tsPath;
    if (existsSync(tsxPath)) return tsxPath;
    if (existsSync(base)) return base;
    return null;
  }

  const candidates = [
    base,
    ...SUPPORTED_EXTS.map((ext) => base + ext),
    ...SUPPORTED_EXTS.map((ext) => resolve(base, "index" + ext)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function classifySkip(specifier: string): DepSkipReason | null {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return specifier.startsWith("@") ? "alias" : "external";
  }
  return null;
}

export async function resolveDeps(
  entrypoint: string,
  root: string,
  opts: ResolveDepsOptions = {},
): Promise<DepGraph> {
  const maxDepth = opts.maxDepth ?? 10;
  const includeTests = opts.includeTests ?? false;

  const absEntry = resolve(root, entrypoint);
  const toRel = (abs: string) => relative(root, abs).replace(/\\/g, "/");

  const files: string[] = [];
  const edges: [string, string][] = [];
  const skipped: DepSkip[] = [];

  const queue: [string, number][] = [[absEntry, 0]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [current, depth] = queue.shift()!;

    if (visited.has(current)) continue;
    visited.add(current);
    files.push(toRel(current));

    const { specifiers, dynamicVariables } = extractSpecifiers(current);
    const fromRel = toRel(current);

    for (const raw of dynamicVariables) {
      skipped.push({ from: fromRel, specifier: raw, reason: "dynamic-variable" });
    }

    for (const specifier of specifiers) {
      const skipReason = classifySkip(specifier);
      if (skipReason !== null) {
        skipped.push({ from: fromRel, specifier, reason: skipReason });
        continue;
      }

      const resolved = resolveSpecifier(specifier, current);
      if (resolved === null) {
        skipped.push({ from: fromRel, specifier, reason: "missing" });
        continue;
      }

      const ext = extname(resolved);
      if (!SUPPORTED_EXTS.includes(ext as (typeof SUPPORTED_EXTS)[number])) {
        skipped.push({ from: fromRel, specifier, reason: "unsupported-extension" });
        continue;
      }

      if (!includeTests && TEST_PATTERN.test(resolved)) {
        skipped.push({ from: fromRel, specifier, reason: "excluded" });
        continue;
      }

      const resolvedRel = toRel(resolved);
      edges.push([fromRel, resolvedRel]);

      if (!visited.has(resolved)) {
        if (depth >= maxDepth) {
          skipped.push({ from: fromRel, specifier, reason: "max-depth" });
          continue;
        }
        queue.push([resolved, depth + 1]);
      }
    }
  }

  return { entrypoint: toRel(absEntry), root, files, edges, skipped };
}

interface TreeNode {
  file: string;
  children: TreeNode[];
  visited: boolean;
}

function buildTreeNode(
  file: string,
  edgeMap: Map<string, string[]>,
  seen: Set<string>,
): TreeNode {
  if (seen.has(file)) {
    return { file, children: [], visited: true };
  }
  seen.add(file);
  const children = (edgeMap.get(file) ?? []).map((child) =>
    buildTreeNode(child, edgeMap, seen),
  );
  return { file, children, visited: false };
}

function renderTree(
  node: TreeNode,
  prefix = "",
  isLast = true,
  isRoot = true,
): string {
  const label = node.file + (node.visited ? " (visited)" : "");
  const line = isRoot ? label : prefix + (isLast ? "└── " : "├── ") + label;
  if (node.children.length === 0) return line;
  const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
  const childLines = node.children.map((child, i) =>
    renderTree(child, childPrefix, i === node.children.length - 1, false),
  );
  return [line, ...childLines].join("\n");
}

export function renderDepTree(graph: DepGraph): string {
  const edgeMap = new Map<string, string[]>();
  for (const [from, to] of graph.edges) {
    const list = edgeMap.get(from) ?? [];
    if (!list.includes(to)) list.push(to);
    edgeMap.set(from, list);
  }
  const root = buildTreeNode(graph.entrypoint, edgeMap, new Set());
  return renderTree(root);
}

export function renderSkippedTable(graph: DepGraph): string {
  if (graph.skipped.length === 0) return "_none_";
  const header = "| from | specifier | reason |\n|------|-----------|--------|";
  const rows = graph.skipped.map(
    ({ from, specifier, reason }) => `| ${from} | ${specifier} | ${reason} |`,
  );
  return [header, ...rows].join("\n");
}
