import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import pc from "picocolors";

export type ReportOptions = {
  kind?: string;
  stack?: string;
  output?: string;
};

export async function runReport(
  name: string,
  options: ReportOptions,
): Promise<void> {
  const root = process.cwd();
  const kind = options.kind ?? "implementation";
  const stack = options.stack ?? "docs";
  const evId = `ev:${stack}.report-${name}`;
  const today = new Date().toISOString().slice(0, 10);

  const frontmatter = [
    "---",
    `ev_id: ${evId}`,
    `type: report`,
    `report_kind: ${kind}`,
    `title: ""`,
    `status: draft`,
    `created_at: ${today}`,
    `updated_at: ${today}`,
    ``,
    `goal: ""`,
    `modified_areas: []`,
    `semantic_impact: []`,
    `architectural_consequences: []`,
    `remaining_risks: []`,
    `known_assumptions: []`,
    `unresolved_contradictions: []`,
    `required_packs_for_continuation: []`,
    `suggested_next_actions: []`,
    `related_reports: []`,
    ``,
    `supersedes: []`,
    `superseded_by: []`,
    `tags: []`,
    "---",
    "",
    `# ${evId}`,
    "",
  ].join("\n");

  const outputPath = options.output
    ? path.resolve(options.output)
    : path.join(root, "artifacts", "reports", `${name}.report.md`)

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, frontmatter, "utf8");

  console.log(pc.green("✔"), `report scaffold generated → ${outputPath}`);
  console.log(pc.green("✔"), `ev_id: ${evId}`);
}
