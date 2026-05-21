---
ev_id: ev:docs.EVLite — Report Design v0.2
stack: docs
status: draft
tags: []
depends_on: []
related: []
supersedes: []
---

# EVLite — Report Design v0.2

Status: Draft
Scope: EvidenceVault Lite / Reports / ObserverAI / AI-native Development Workflow

---

# 1. Purpose

A Report is a structured semantic observation artifact.
Its purpose is NOT merely:

```
"what files changed?"
```
Its purpose IS:
```
- what changed semantically
- what assumptions were introduced
- what contradictions remain
- what risks were created
- what context is required to continue
```

A Report compresses:
```
implementation
analysis
reasoning
architectural impact
```
into a replayable cognitive artifact.

---

# 2. Position in EVLite

| Artifact | Primary Role                    |
| -------- | ------------------------------- |
| report   | semantic observation artifact   |
| handover | operational continuity artifact |
| snapshot | compressed active state         |
| pack     | curated context entrypoint      |

---

# 3. Core Philosophy

Traditional reports focus on:
```
"What was modified?"
```

EVLite Reports focus on:
```
"What changed in the cognitive topology?"
```

This includes:

* semantic consequences
* architectural drift
* unresolved contradictions
* dependency shifts
* continuation requirements

---

# 4. Canonical Structure

```markdown
# Implementation Report

## Goal

## Modified Areas

## Semantic Impact

## Architectural Consequences

## Remaining Risks

## Known Assumptions

## Unresolved Contradictions

## Required Packs For Continuation

## Suggested Next Actions

## Related Reports

## Supersedes
```

---

# 5. Section Definitions

---

## Goal

What was intended.

Examples:
```
- add semantic condensation layer
- refactor workspace lifecycle
- separate report and handover semantics
```

---

## Modified Areas

What changed physically or structurally.

Examples:
```
- docs
- packs
- schemas
- adapters
- routing logic
- observer pipeline
```

---

## Semantic Impact

The most important section.

Describes:
```
- meaning changes
- cognitive topology changes
- reachability changes
- interpretation changes
```

Examples:
```
- ObserverAI no longer consumes raw replay directly
- stale reports become lower-priority context sources
- semantic condensation becomes required before observation
```

---

## Architectural Consequences

Long-term structural implications.

Examples:
```
- tighter coupling
- reduced replay cost
- new dependency boundaries
- altered authority model
- additional observer layer
```

This section exists because:

```
implementation effects
≠
architectural consequences
```

---

## Remaining Risks

Known unresolved dangers.

Examples:
```
- semantic recursion still possible
- stale packs may remain reachable
- observer summarization loops not fully bounded
```

---

## Known Assumptions

Important implicit assumptions.

Examples:
```
- reports are append-only artifacts
- packs are human-reviewable
- semantic condensation layer exists
```

This section is critical because AI systems often silently infer assumptions.

---

## Unresolved Contradictions

Known tensions or unresolved inconsistencies.

Examples:
```
- replay completeness vs semantic compression
- historical preservation vs context minimization
- observer visibility vs cognitive overload
```

This section is highly important for AI-native systems.

AI agents tend to:
```
silently flatten contradictions
```

Explicit contradiction preservation is therefore valuable.

---

## Required Packs For Continuation

Curated context entrypoints required for future work.

Examples:
```
- pack:observer-ai-overview
- pack:evlite-overview
- pack:crm-basics
```

This turns reports into:
```
context routing nodes
```

rather than isolated documents.

---

## Suggested Next Actions

Recommended future work.

Examples:
```
- implement semantic deduplication
- add stale pack detection
- design observer digest cache
```

---

## Related Reports

Connected reports or investigations.

Examples:
```
- ev:report.semantic-condensation
- ev:report.workspace-routing
```

---

## Supersedes

Older reports replaced by this report.

Supports lifecycle semantics:
```
active
→ superseded
→ archived
```

without destructive deletion.

---

# 6. Canonical Type

```ts
type EVReport = {
  id: string;
  type: "report";

  report_kind:
    | "implementation"
    | "analysis"
    | "architecture"
    | "research"
    | "incident"
    | "observer"
    | "retrospective";

  title: string;

  created_at: string;
  updated_at?: string;

  status:
    | "active"
    | "draft"
    | "superseded"
    | "archived";

  goal?: string;

  modified_areas?: string[];

  semantic_impact?: string[];

  architectural_consequences?: string[];

  remaining_risks?: string[];

  known_assumptions?: string[];

  unresolved_contradictions?: string[];

  required_packs_for_continuation?: string[];

  suggested_next_actions?: string[];

  related_reports?: string[];

  supersedes?: string[];
  superseded_by?: string[];

  tags?: string[];

  metadata?: {
    reference_count?: number;
    used_in_packs?: number;
    used_by_agents?: number;
    last_referenced_at?: string;
  };
};
```

---

# 7. Example Frontmatter

```yaml
ev_id: ev:report.observer-semantic-condensation
type: report
report_kind: architecture

title: ObserverAI Semantic Condensation Design

status: active

created_at: 2026-05-21
updated_at: 2026-05-21

tags:
  - observer-ai
  - semantic-condensation
  - architecture
  - report

required_packs_for_continuation:
  - pack:observer-ai-overview
  - pack:evlite-overview

supersedes: []
superseded_by: []
```

---

# 8. Auto-Derived Semantic Tags

Reports may automatically derive tags such as:
```
[NEW]
[OLD]
[STALE]
[SUPERSEDED]
[FOUNDATIONAL]
[HOT]
[CORE]
```

based on:
```
- age
- reference count
- pack usage
- agent usage
- supersede chains
```

---

# 9. ObserverAI Relevance

Reports are useful for:
```
- semantic replay
- anomaly analysis
- architectural drift detection
- governance review
- contradiction tracking
- long-term cognition analysis
```

ObserverAI should treat reports as:
```
compressed semantic evidence
```

NOT:
```
authoritative operational state
```

without freshness validation.

---

# 10. Long-term Vision

Reports evolve from:
```
human-readable summaries
```

into:
```
semantic cognition artifacts
```

Possible future extensions:
```
- semantic diff reports
- contradiction lineage
- auto-supersede detection
- observer-generated delta reports
- pack dependency analysis
- stale reasoning detection
- semantic replay graph
```

---

# 11. Core Principle

```
A report is not raw history.

A report is compressed semantic observation.
```

Its role is:

```
preserve meaning,
preserve contradictions,
preserve cognitive consequences.
```
