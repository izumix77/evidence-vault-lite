import path from "node:path";
import fs from "fs-extra";
import matter from "gray-matter";

const FRONTMATTER_RE = /^---\r?\n/;

export type MarkdownFilePayload = {
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

export async function readMarkdownFile(
  root: string,
  relPath: string,
): Promise<MarkdownFilePayload> {
  const absolutePath = path.join(root, relPath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = matter(raw);
  return {
    path: relPath,
    frontmatter: parsed.data as Record<string, unknown>,
    body: parsed.content,
  };
}

export async function writeMarkdownFile(
  root: string,
  relPath: string,
  frontmatter: Record<string, unknown>,
  body: string,
): Promise<void> {
  const absolutePath = path.join(root, relPath);
  const output = matter.stringify(body, frontmatter);
  await fs.writeFile(absolutePath, output, "utf8");
}

export async function initMeta(
  root: string,
  relPath: string,
): Promise<"inserted" | "skipped"> {
  const absolutePath = path.isAbsolute(relPath)
    ? relPath
    : path.join(root, relPath);
  const content = await fs.readFile(absolutePath, "utf8");

  if (FRONTMATTER_RE.test(content)) {
    return "skipped";
  }

  const stack = path.basename(path.dirname(absolutePath));
  const baseName = path.basename(absolutePath, path.extname(absolutePath));
  const evId = `ev:${stack}.${baseName}`;

  const frontmatter =
    [
      "---",
      `ev_id: ${evId}`,
      `stack: ${stack}`,
      "status: draft",
      "tags: []",
      "depends_on: []",
      "related: []",
      "supersedes: []",
      "---",
      "",
    ].join("\n") + "\n";

  await fs.writeFile(absolutePath, frontmatter + content, "utf8");
  return "inserted";
}
