import { z } from "zod";

export const EvidenceNodeKindSchema = z.enum(["file", "section"]);

export const EvidenceStatusSchema = z.enum([
  "active",
  "draft",
  "experimental",
  "deprecated",
  "archived",
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

export const ContextPackSchema = z.object({
  id:         z.string(),
  goal:       z.string(),
  mustRead:   z.array(z.string()),
  doNotInfer: z.array(z.string()),
  outputGoal: z.array(z.string()),
  status:     z.enum(["active", "draft"]).optional(),
});
