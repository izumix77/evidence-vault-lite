import path from "node:path";
import fs from "fs-extra";
import matter from "gray-matter";
import { EvidenceStatusSchema, type EvidenceNode } from "@ev-lite/shared";

const EXCERPT_LENGTH = 200;

function extractFirstH1(content: string): string | undefined {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) return match[1];
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

export async function parseFile(
  root: string,
  filePath: string,
): Promise<EvidenceNode> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(root, filePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const { data, content } = matter(raw);

  const trimmed = content.trim();
  const excerpt = trimmed.length > 0 ? trimmed.slice(0, EXCERPT_LENGTH) : undefined;

  const titleFromFrontmatter =
    typeof data.title === "string" ? data.title : undefined;
  const title = titleFromFrontmatter ?? extractFirstH1(trimmed);

  const statusParsed = EvidenceStatusSchema.safeParse(data.status);
  const status = statusParsed.success ? statusParsed.data : undefined;

  const relativePath = toPosix(path.relative(root, absolutePath));

  // HandoverReport: must_read is the dependency edge (next-session required reading).
  // Treat it as depends_on for graph traversal without writing back to frontmatter.
  const declaredDepends = asStringArray(data.depends_on);
  const depends_on =
    data.type === "handover"
      ? dedupe([...asStringArray(data.must_read), ...declaredDepends])
      : declaredDepends;

  return {
    ev_id:      typeof data.ev_id === "string" ? data.ev_id : null,
    kind:       "file",
    path:       relativePath,
    anchor:     undefined,
    stack:      typeof data.stack === "string" ? data.stack : undefined,
    status,
    tags:       asStringArray(data.tags),
    depends_on,
    related:    asStringArray(data.related),
    supersedes: asStringArray(data.supersedes),
    title,
    excerpt,
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
