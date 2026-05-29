import type { DerivedTag, EvidenceNode } from "@ev-lite/shared";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function getDocDate(node: EvidenceNode): Date | undefined {
  return parseIsoDate(node.updated_at) ?? parseIsoDate(node.created_at);
}

function daysSince(then: Date, now: Date): number {
  return Math.floor((now.getTime() - then.getTime()) / MS_PER_DAY);
}

export type DeriveTagsContext = {
  effectivelySuperseded?: boolean;
  now?: Date;
};

export function deriveTags(
  node: EvidenceNode,
  ctx: DeriveTagsContext = {},
): DerivedTag[] {
  const tags: DerivedTag[] = [];
  const now = ctx.now ?? new Date();
  const docDate = getDocDate(node);

  // Freshness — only if a parseable date exists
  if (docDate) {
    const age = daysSince(docDate, now);
    if (age <= 30) tags.push("NEW");
    else if (age <= 90) tags.push("RECENT");
    if (age >= 365) tags.push("OLD");
  }

  // Lifecycle — explicit STALE is its own tag, distinct from status="stale"
  if (node.status === "stale") tags.push("STALE");
  if (node.status === "active") tags.push("ACTIVE");
  if (node.status === "archived") tags.push("ARCHIVED");
  if (node.status === "experimental") tags.push("EXPERIMENTAL");
  if (node.status === "superseded" || ctx.effectivelySuperseded) {
    if (!tags.includes("SUPERSEDED")) tags.push("SUPERSEDED");
  }

  // Usage — only if importance present
  const imp = node.importance;
  if (imp) {
    const refCount = imp.reference_count ?? 0;
    const packDepCount = imp.pack_dependency_count ?? 0;
    if (refCount >= 10) tags.push("CORE");
    if (docDate && daysSince(docDate, now) >= 365 && refCount >= 10) {
      tags.push("FOUNDATIONAL");
    }
    if (packDepCount >= 3) tags.push("HOT");
    // COLD: pure referential state — not a risk signal by itself.
    // Use ORPHAN (in importance-report) for operational risk assessment.
    if (refCount === 0 && packDepCount === 0) tags.push("COLD");
  }

  return tags;
}
