import type { z } from "zod";
import type {
  EvidenceNodeKindSchema,
  EvidenceStatusSchema,
  EvidenceNodeSchema,
  ContextPackSchema,
  EVReportKindSchema,
  EVReportSchema,
  HandoverReportSchema,
} from "./schemas.js";

export type EvidenceNodeKind = z.infer<typeof EvidenceNodeKindSchema>;
export type EvidenceStatus   = z.infer<typeof EvidenceStatusSchema>;
export type EvidenceNode     = z.infer<typeof EvidenceNodeSchema>;
export type ContextPack      = z.infer<typeof ContextPackSchema>;
export type EVReportKind     = z.infer<typeof EVReportKindSchema>;
export type EVReport         = z.infer<typeof EVReportSchema>;
export type HandoverReport   = z.infer<typeof HandoverReportSchema>;
