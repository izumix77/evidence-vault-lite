import path from "node:path";
import fs from "fs-extra";
import {
  ContextPackSchema,
  type ContextPack,
} from "@ev-lite/shared";
import { generateSnapshot } from "./snapshot.js";
import { DEFAULT_DEPS_MAX_DEPTH, resolveDeps } from "./deps.js";
import { scanRepo } from "./scan.js";
import { saveRegistry } from "./registry.js";
import { buildPack } from "./pack.js";
import {
  EV_LITE_DIR,
  PACK_ID_PREFIX,
  getRegistryPath,
  packIdToBasename,
} from "./paths.js";
import { writePackConfig } from "./packs.js";

export interface ContextOptions {
  path: string;
  root: string;
  goal: string;
  stack?: string;
  maxDepth?: number;
  includeTests?: boolean;
  noContent?: boolean;
  outputDir?: string;
  force?: boolean;
  dryRun?: boolean;
}

export interface ContextResult {
  snapshotEvId: string;
  snapshotOutput: string;
  packId: string;
  packJsonPath: string;
  packMdPath: string;
  pack: ContextPack;
}

export interface ContextDryRunResult {
  _dryRun: true;
  id: string;
  goal: string;
  mustRead: string[];
  doNotInfer: string[];
  outputGoal: string[];
  status: "active";
  _resolvedFiles: number;
  _skippedImports: number;
}

const DEFAULT_DO_NOT_INFER = [
  "Do not modify files outside the dependency scope",
  "Do not assume implementation details not present in the provided files",
];

const DEFAULT_OUTPUT_GOAL = [
  "Implement the goal described above",
  "Verify with pnpm typecheck and existing tests",
];

function deriveBaseNoExt(opts: ContextOptions): string {
  const absolutePath = path.isAbsolute(opts.path)
    ? opts.path
    : path.resolve(opts.root, opts.path);
  return path.basename(absolutePath).replace(/\.[^.]+$/, "");
}

function deriveStack(opts: ContextOptions, baseNoExt: string): string {
  return opts.stack ?? baseNoExt;
}

function makeTimestamp(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

function makePackId(baseNoExt: string, now: Date = new Date()): string {
  return `${PACK_ID_PREFIX}context-${baseNoExt}-${makeTimestamp(now)}`;
}

function buildPackObject(
  packId: string,
  goal: string,
  snapshotEvId: string,
): ContextPack {
  return {
    id: packId,
    goal,
    mustRead: [snapshotEvId],
    doNotInfer: [...DEFAULT_DO_NOT_INFER],
    outputGoal: [...DEFAULT_OUTPUT_GOAL],
    status: "active",
  };
}

export async function generateContext(
  opts: ContextOptions,
): Promise<ContextResult> {
  const baseNoExt = deriveBaseNoExt(opts);
  const stack = deriveStack(opts, baseNoExt);
  const packId = makePackId(baseNoExt);
  const packBaseName = packIdToBasename(packId);
  const outputDir = opts.outputDir ?? EV_LITE_DIR;

  const snapshotOutput = path.join(
    opts.root,
    outputDir,
    "snapshots",
    `${baseNoExt}.md`,
  );
  const packJsonPath = path.join(
    opts.root,
    outputDir,
    "packs",
    `${packBaseName}.json`,
  );
  const packMdPath = path.join(
    opts.root,
    outputDir,
    "packs",
    `${packBaseName}.md`,
  );

  if (!opts.force) {
    if (await fs.pathExists(packJsonPath)) {
      throw new Error(
        `Pack already exists: ${packJsonPath} (use --force to overwrite)`,
      );
    }
  }

  const snapshotMeta = await generateSnapshot({
    path: opts.path,
    root: opts.root,
    stack,
    output: snapshotOutput,
    deps: true,
    maxDepth: opts.maxDepth,
    includeTests: opts.includeTests,
    noContent: opts.noContent,
  });

  const registry = await scanRepo(opts.root);
  await saveRegistry(getRegistryPath(opts.root), registry);

  const pack = buildPackObject(packId, opts.goal, snapshotMeta.evId);
  const validatedPack = ContextPackSchema.parse(pack);

  if (opts.outputDir) {
    await fs.ensureDir(path.dirname(packJsonPath));
    await fs.writeJson(packJsonPath, validatedPack, { spaces: 2 });
  } else {
    await writePackConfig(opts.root, packId, validatedPack);
  }

  const packMarkdown = await buildPack(validatedPack, registry, opts.root);
  await fs.ensureDir(path.dirname(packMdPath));
  await fs.writeFile(packMdPath, packMarkdown, "utf8");

  return {
    snapshotEvId: snapshotMeta.evId,
    snapshotOutput: snapshotMeta.output,
    packId,
    packJsonPath,
    packMdPath,
    pack: validatedPack,
  };
}

export async function generateContextDryRun(
  opts: ContextOptions,
): Promise<ContextDryRunResult> {
  const baseNoExt = deriveBaseNoExt(opts);
  const stack = deriveStack(opts, baseNoExt);
  const packId = makePackId(baseNoExt);

  const graph = await resolveDeps(opts.path, opts.root, {
    maxDepth: opts.maxDepth ?? DEFAULT_DEPS_MAX_DEPTH,
    includeTests: opts.includeTests ?? false,
  });

  const estimatedEvId = `ev:${stack}.snapshot-${baseNoExt}`;

  return {
    _dryRun: true,
    id: packId,
    goal: opts.goal,
    mustRead: [estimatedEvId],
    doNotInfer: [...DEFAULT_DO_NOT_INFER],
    outputGoal: [...DEFAULT_OUTPUT_GOAL],
    status: "active",
    _resolvedFiles: graph.files.length,
    _skippedImports: graph.skipped.length,
  };
}
