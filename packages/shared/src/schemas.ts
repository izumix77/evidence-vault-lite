import { z } from "zod";

export const EvidenceNodeKindSchema = z.enum(["file", "section"]);

export const EvidenceStatusSchema = z.enum([
  "active",
  "draft",
  "experimental",
  "deprecated",
  "archived",
  "superseded",
  "stale",
]);

export const EvidenceNodeSchema = z.object({
  ev_id:      z.string().nullable(),
  kind:       EvidenceNodeKindSchema,
  path:       z.string(),
  anchor:     z.string().optional(),
  stack:      z.string().optional(),
  status:     EvidenceStatusSchema.optional(),
  tags:       z.array(z.string()),
  depends_on: z.array(z.string()),
  related:    z.array(z.string()),
  supersedes: z.array(z.string()),
  title:      z.string().optional(),
  excerpt:    z.string().optional(),
});

export const EVReportKindSchema = z.enum([
  "implementation",
  "analysis",
  "architecture",
  "research",
  "incident",
  "observer",
  "retrospective",
]);

export const EVReportSchema = z.object({
  id:           z.string(),
  type:         z.literal("report"),
  report_kind:  EVReportKindSchema,
  title:        z.string(),
  created_at:   z.string(),
  updated_at:   z.string().optional(),
  status:       EvidenceStatusSchema.optional(),

  goal:                            z.string().optional(),
  modified_areas:                  z.array(z.string()).optional(),
  semantic_impact:                 z.array(z.string()).optional(),
  architectural_consequences:      z.array(z.string()).optional(),
  remaining_risks:                 z.array(z.string()).optional(),
  known_assumptions:               z.array(z.string()).optional(),
  unresolved_contradictions:       z.array(z.string()).optional(),
  required_packs_for_continuation: z.array(z.string()).optional(),
  suggested_next_actions:          z.array(z.string()).optional(),
  related_reports:                 z.array(z.string()).optional(),

  supersedes:    z.array(z.string()).optional(),
  superseded_by: z.array(z.string()).optional(),
  tags:          z.array(z.string()).optional(),
});

export const ContextPackSchema = z.object({
  id:         z.string(),
  goal:       z.string(),
  mustRead:   z.array(z.string()),
  doNotInfer: z.array(z.string()),
  outputGoal: z.array(z.string()),
  status:     z.enum(["active", "draft"]).optional(),
});
