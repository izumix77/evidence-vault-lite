import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import pc from "picocolors";

const FRONTMATTER_RE = /^---\r?\n/;

export async function runInitMeta(file: string): Promise<void> {
  const resolved = path.resolve(file);
  const content = await readFile(resolved, "utf8");

  if (FRONTMATTER_RE.test(content)) {
    console.log(
      pc.yellow("WARN:"),
      `frontmatter already exists in ${file} — skipped`,
    );
    return;
  }

  const stack = path.basename(path.dirname(resolved));
  const baseName = path.basename(resolved, path.extname(resolved));
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

  await writeFile(resolved, frontmatter + content, "utf8");
  console.log(pc.green("✔"), `frontmatter inserted → ${file}`);
}
