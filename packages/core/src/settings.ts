import fs from "fs-extra";
import { getSettingsPath } from "./paths.js";

export type EvLiteSettings = {
  port?: number;
  description?: string;
};

export async function readSettings(root: string): Promise<EvLiteSettings> {
  const filepath = getSettingsPath(root);
  if (!(await fs.pathExists(filepath))) return {};
  try {
    const data = await fs.readJson(filepath);
    if (typeof data !== "object" || data === null) return {};
    return data as EvLiteSettings;
  } catch {
    return {};
  }
}
