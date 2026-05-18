import path from "node:path";
import fs from "fs-extra";
import matter from "gray-matter";

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
