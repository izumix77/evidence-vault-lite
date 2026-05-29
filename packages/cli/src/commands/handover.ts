import path from "node:path";
import { writeFile, mkdir, access } from "node:fs/promises";
import pc from "picocolors";
import { buildHandoverTemplate } from "@ev-lite/core";

export type HandoverOptions = {
  output?: string;
};

export function resolveHandoverPath(
  root: string,
  name: string,
  output?: string,
): string {
  return output
    ? path.resolve(output)
    : path.join(root, "artifacts", "handovers", `${name}.handover.md`);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function generateHandoverFile(
  root: string,
  name: string,
  options: HandoverOptions = {},
): Promise<{ path: string; evId: string }> {
  const outputPath = resolveHandoverPath(root, name, options.output);
  if (await fileExists(outputPath)) {
    throw new Error(`File already exists: ${outputPath}`);
  }
  const today = new Date().toISOString().slice(0, 10);
  const content = buildHandoverTemplate(name, today);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
  return { path: outputPath, evId: `ev:handover.${name}` };
}

export async function runHandover(
  name: string,
  options: HandoverOptions,
): Promise<void> {
  const root = process.cwd();
  const result = await generateHandoverFile(root, name, options);
  console.log(pc.green("✔"), `handover scaffold generated → ${result.path}`);
  console.log(pc.green("✔"), `ev_id: ${result.evId}`);
}
