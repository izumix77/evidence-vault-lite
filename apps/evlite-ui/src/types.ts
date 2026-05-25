export type EvidenceNodeKind = "file" | "section";

export type EvidenceStatus =
  | "active"
  | "draft"
  | "experimental"
  | "deprecated"
  | "archived";

export const EVIDENCE_STATUSES: EvidenceStatus[] = [
  "active",
  "draft",
  "experimental",
  "deprecated",
  "archived",
];

export type EvidenceNode = {
  ev_id: string | null;
  kind: EvidenceNodeKind;
  path: string;
  anchor?: string;
  stack?: string;
  status?: EvidenceStatus;
  tags: string[];
  depends_on: string[];
  related: string[];
  supersedes: string[];
  title?: string;
  excerpt?: string;
};

export type ContextPack = {
  id: string;
  goal: string;
  mustRead: string[];
  doNotInfer: string[];
  outputGoal: string[];
  status?: "active" | "draft";
};

export type Registry = {
  generated_at: string;
  root: string;
  nodes: EvidenceNode[];
};

export type MarkdownFilePayload = {
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

export type SnapshotInput = {
  path: string;
  stack?: string;
  title?: string;
  output?: string;
  include?: string[];
  exclude?: string[];
  noContent?: boolean;
  deps?: boolean;
  maxDepth?: number;
  includeTests?: boolean;
  noDepTree?: boolean;
};

export type SnapshotResult = {
  evId: string;
  output: string;
  fileCount: number;
  depGraph?: {
    edges: number;
    skipped: number;
  };
};
