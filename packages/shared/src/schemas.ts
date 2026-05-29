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

export const DerivedTagSchema = z.enum([
  // Freshness
  "NEW",
  "RECENT",
  "OLD",
  "STALE",
  // Lifecycle
  "ACTIVE",
  "SUPERSEDED",
  "ARCHIVED",
  "EXPERIMENTAL",
  // Usage (populated by P9-b)
  "HOT",
  "CORE",
  "COLD",
  "FOUNDATIONAL",
]);

export const ImportanceSchema = z.object({
  explicit_priority:      z.number().min(0).max(1).optional(),
  reference_count:        z.number().optional(),
  pack_dependency_count:  z.number().optional(),
  recent_reference_count: z.number().optional(),
  last_referenced_at:     z.string().optional(),
});

export const EvidenceNodeSchema = z.object({
  ev_id:        z.string().nullable(),
  kind:         EvidenceNodeKindSchema,
  path:         z.string(),
  anchor:       z.string().optional(),
  stack:        z.string().optional(),
  status:       EvidenceStatusSchema.optional(),
  tags:         z.array(z.string()),
  depends_on:   z.array(z.string()),
  related:      z.array(z.string()),
  supersedes:   z.array(z.string()),
  title:        z.string().optional(),
  excerpt:      z.string().optional(),
  created_at:   z.string().optional(),
  updated_at:   z.string().optional(),
  importance:   ImportanceSchema.optional(),
  derived_tags: z.array(DerivedTagSchema).optional(),
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

export const HandoverReportSchema = z.object({
  id:           z.string(),
  type:         z.literal("handover"),
  title:        z.string(),
  created_at:   z.string(),
  updated_at:   z.string().optional(),

  goal:          z.string(),
  current_state: z.string(),
  next_actions:  z.array(z.string()).default([]),

  must_read:     z.array(z.string()).default([]),
  optional_read: z.array(z.string()).optional(),

  active_decisions:     z.array(z.string()).optional(),
  unresolved_questions: z.array(z.string()).optional(),
  known_risks:          z.array(z.string()).optional(),

  related_packs: z.array(z.string()).optional(),
  related_docs:  z.array(z.string()).optional(),

  status:        EvidenceStatusSchema,
  supersedes:    z.array(z.string()).optional(),
  superseded_by: z.array(z.string()).optional(),
  tags:          z.array(z.string()).optional(),

  metadata: z
    .object({
      reference_count:    z.number().optional(),
      last_referenced_at: z.string().optional(),
      generated_by:       z.string().optional(),
      generated_at:       z.string().optional(),
    })
    .optional(),
});

export const ContextPackSchema = z.object({
  id:         z.string(),
  goal:       z.string(),
  mustRead:   z.array(z.string()),
  doNotInfer: z.array(z.string()),
  outputGoal: z.array(z.string()),
  status:     z.enum(["active", "draft"]).optional(),
  related:    z.array(z.string()).optional(),
});
