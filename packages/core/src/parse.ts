import path from "node:path";
import fs from "fs-extra";
import matter from "gray-matter";
import {
  EvidenceStatusSchema,
  type EvidenceNode,
  type Importance,
} from "@ev-lite/shared";

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

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// js-yaml auto-parses ISO 8601 timestamps into Date objects, so accept both.
function asDateString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return undefined;
}

function parseImportance(value: unknown): Importance | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  const result: Importance = {};
  if (typeof obj.explicit_priority === "number") {
    result.explicit_priority = obj.explicit_priority;
  }
  if (typeof obj.reference_count === "number") {
    result.reference_count = obj.reference_count;
  }
  if (typeof obj.pack_dependency_count === "number") {
    result.pack_dependency_count = obj.pack_dependency_count;
  }
  if (typeof obj.recent_reference_count === "number") {
    result.recent_reference_count = obj.recent_reference_count;
  }
  const lastRef = asDateString(obj.last_referenced_at);
  if (lastRef) result.last_referenced_at = lastRef;
  return Object.keys(result).length > 0 ? result : undefined;
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
    created_at: asDateString(data.created_at),
    updated_at: asDateString(data.updated_at),
    importance: parseImportance(data.importance),
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
