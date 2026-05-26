export type DepSkipReason =
  | "external"
  | "alias"
  | "unsupported-extension"
  | "missing"
  | "dynamic-variable"
  | "excluded"
  | "max-depth";

export interface DepSkip {
  from: string;
  specifier: string;
  reason: DepSkipReason;
}

export interface DepGraph {
  entrypoint: string;
  root: string;
  files: string[];
  edges: [string, string][];
  skipped: DepSkip[];
}

export interface DepGraphJsonOutput {
  mode: "deps";
  entrypoint: string;
  root: string;
  files: string[];
  edges: [string, string][];
  skipped: DepSkip[];
  summary: {
    fileCount: number;
    edgeCount: number;
    skippedCount: number;
    maxDepth: number;
    includeTests: boolean;
  };
}
