import path from "node:path";
import { writeFile, mkdir, access } from "node:fs/promises";
import type { Hono } from "hono";
import {
  loadRegistry,
  getRegistryPath,
  readMarkdownFile,
} from "@ev-lite/core";
import type { EvidenceNode } from "@ev-lite/core";

type HandoverNode = EvidenceNode & {
  must_read?: string[];
  next_actions?: string[];
  created_at?: string;
};

function buildHandoverFrontmatter(name: string, date: string): string {
  const evId = `ev:handover.${name}`;
  return [
    "---",
    `ev_id: ${evId}`,
    `type: handover`,
    `title: ${name}`,
    `status: active`,
    `created_at: ${date}`,
    ``,
    `must_read: []`,
    `optional_read: []`,
    ``,
    `goal: ""`,
    `current_state: ""`,
    `next_actions: []`,
    ``,
    `active_decisions: []`,
    `unresolved_questions: []`,
    `known_risks: []`,
    ``,
    `related_packs: []`,
    `related_docs: []`,
    ``,
    `supersedes: []`,
    `superseded_by: []`,
    ``,
    `tags: []`,
    "---",
    "",
    `# ${name}`,
    "",
    `<!-- goal, current_state, next_actions を記述 -->`,
    "",
  ].join("\n");
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === "string");
}

async function enrichHandoverNode(
  root: string,
  node: EvidenceNode,
): Promise<HandoverNode> {
  try {
    const payload = await readMarkdownFile(root, node.path);
    const fm = payload.frontmatter;
    return {
      ...node,
      must_read: asStringArray(fm.must_read),
      next_actions: asStringArray(fm.next_actions),
      created_at:
        typeof fm.created_at === "string" ? fm.created_at : undefined,
    };
  } catch {
    return node;
  }
}

export function registerHandoverRoutes(
  app: Hono,
  opts: { root: string },
): void {
  app.get("/api/handovers", async (c) => {
    const registry = await loadRegistry(getRegistryPath(opts.root));
    const handovers = registry.nodes.filter(
      (node) =>
        node.ev_id !== null && node.ev_id.startsWith("ev:handover."),
    );
    const enriched = await Promise.all(
      handovers.map((n) => enrichHandoverNode(opts.root, n)),
    );
    return c.json(enriched);
  });

  app.post("/api/handover", async (c) => {
    let body: { name?: unknown; output?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return c.json({ error: "name is required" }, 400);
    }
    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
      return c.json(
        { error: "name may only contain letters, digits, '.', '_', '-'" },
        400,
      );
    }
    const output =
      typeof body.output === "string" && body.output.trim()
        ? body.output.trim()
        : undefined;
    const outputPath = output
      ? path.resolve(opts.root, output)
      : path.join(opts.root, "artifacts", "handovers", `${name}.handover.md`);

    if (await fileExists(outputPath)) {
      return c.json(
        { error: `File already exists: ${outputPath}` },
        409,
      );
    }
    const today = new Date().toISOString().slice(0, 10);
    const content = buildHandoverFrontmatter(name, today);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, "utf8");

    const relPath = path.relative(opts.root, outputPath).replace(/\\/g, "/");
    return c.json(
      { path: relPath, evId: `ev:handover.${name}` },
      201,
    );
  });
}
