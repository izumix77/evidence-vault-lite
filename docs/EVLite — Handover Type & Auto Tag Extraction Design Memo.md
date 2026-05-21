---
ev_id: ev:docs.EVLite — Handover Type & Auto Tag Extraction Design Memo
stack: docs
status: draft
tags: []
depends_on: []
related: []
supersedes: []
---

# EVLite — Handover Type & Auto Tag Extraction Design Memo

Status: Draft
Scope: EvidenceVault Lite / Context Pack / Handover Report

## 1. Purpose

EVLite の handover は、単なる「次のAIへの申し送り」ではなく、現在の認知状態を圧縮した context artifact として扱う。

目的は以下：

- セッション間の作業継続
- 文書管理
- コンテキスト圧縮
- 古い文書・重要文書の識別
- AI が読むべき文書の誘導
- ObserverAI / BurnScope による stale dependency 検出

## 2. Handover Type

```ts
type HandoverReport = {
  id: string;                 // ev:handover.xxx
  type: "handover";
  title: string;
  created_at: string;
  updated_at?: string;

  goal: string;
  current_state: string;
  next_actions: string[];

  must_read: string[];
  optional_read?: string[];

  active_decisions?: string[];
  unresolved_questions?: string[];
  known_risks?: string[];

  related_packs?: string[];
  related_docs?: string[];

  status: "active" | "stale" | "superseded" | "archived";
  freshness?: "new" | "recent" | "normal" | "old";

  supersedes?: string[];
  superseded_by?: string[];

  metadata?: {
    reference_count?: number;
    last_referenced_at?: string;
    generated_by?: string;
    generated_at?: string;
  };
};
````

## 3. Recommended Frontmatter

```yaml
ev_id: ev:handover.observer-ai-context-compression
type: handover
title: ObserverAI Context Compression Handover
status: active
freshness: recent
created_at: 2026-05-21
updated_at: 2026-05-21

must_read:
  - ev:burnscope.ObserverAI
  - ev:traceos.TraceOS
  - ev:evlite.ContextPack

related_packs:
  - pack:evlite-overview

related_docs:
  - ev:observer.semantic-condensation

supersedes: []
superseded_by: []

tags:
  - observer-ai
  - context-compression
  - semantic-condensation
  - handover
```

## 4. Auto Tag Extraction

EVLite can derive display tags from metadata and usage.

### 4.1 Freshness Tags

```
[NEW]       updated within 30 days
[RECENT]    updated within 90 days
[OLD]       not updated for 1 year
[STALE]     explicitly marked stale
```

### 4.2 Lifecycle Tags

```
[ACTIVE]       current usable document
[SUPERSEDED]   replaced by another document
[ARCHIVED]     preserved for history
[CANONICAL]    preferred reference
[EXPERIMENTAL] draft / unstable
```

### 4.3 Usage Tags

```
[HOT]          recently referenced often
[CORE]         referenced by many packs
[COLD]         rarely referenced recently
[FOUNDATIONAL] old but structurally important
```

## 5. Auto Tag Rules

```ts
function deriveTags(doc: EvDoc): string[] {
  const tags: string[] = [];

  if (updatedWithinDays(doc, 30)) tags.push("NEW");
  if (notUpdatedForDays(doc, 365)) tags.push("OLD");

  if (doc.status === "stale") tags.push("STALE");
  if (doc.status === "superseded") tags.push("SUPERSEDED");
  if (doc.status === "active") tags.push("ACTIVE");

  if ((doc.reference_count ?? 0) >= 10) tags.push("CORE");
  if (referencedRecentlyOften(doc)) tags.push("HOT");

  if (
    notUpdatedForDays(doc, 365) &&
    (doc.reference_count ?? 0) >= 10
  ) {
    tags.push("FOUNDATIONAL");
  }

  return tags;
}
```

## 6. Importance Model

Document importance should emerge from usage topology, not only manual priority.

Possible signals:

```yaml
importance:
  explicit_priority: 0.0
  reference_count: 12
  pack_dependency_count: 5
  recent_reference_count: 3
  last_referenced_at: 2026-05-21
```

Derived concepts:

```
High reference count + many packs
= cognitive core

Old + high reference count
= foundational

New + rising reference count
= emerging hotspot

Old + still referenced by agents
= stale dependency risk
```

## 7. ObserverAI Relevance

ObserverAI should monitor not only agent behavior, but also context usage.

Potential signals:

```
- Agent repeatedly references OLD documents
- Multiple agents depend on SUPERSEDED packs
- HOT documents are not canonical
- Foundational documents have no recent review
- Context packs depend on stale assumptions
```

These can produce:

```
RiskSignal:
  type: "stale_dependency"

RiskSignal:
  type: "knowledge_bottleneck"

RiskSignal:
  type: "semantic_monoculture"
```

## 8. Core Principle

```
History is not active knowledge.
Documents are not equal context.
Importance emerges from usage.
Old does not always mean invalid.
New does not always mean authoritative.
```

EVLite should therefore treat documents, packs, and handovers as lifecycle-managed cognitive artifacts.
