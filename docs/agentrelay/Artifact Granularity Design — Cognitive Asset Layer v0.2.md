---
ev_id: 'ev:agentrelay.Artifact Granularity Design — Cognitive Asset Layer v0.2'
stack: agentrelay
status: active
tags: []
depends_on: []
related:
  - 'ev:AgentRelay.AgentRelay — Overview v0.1'
supersedes:
  - 'ev:AgentRelay.artifact-granularity-v0-1'
---

# Artifact Granularity Design — Cognitive Asset Layer v0.2

> **「Artifact は単なるログではない。DGC に接続可能な認知単位である。」**

**Status:** Draft v0.2
**Position:** EVLite / AgentRelay Cognitive Asset Layer
**License:** Apache 2.0
**Supersedes:** Artifact Granularity Design v0.1

---

## 0. Overview

Artifact Granularity Design は、AI-native workflow において
「どの粒度で認知・判断・実装・監査を保存するか」を定義する。

v0.2 では特に、以下との関係を明確化する。

- AgentRelay
- EvidenceVault Lite
- DGC
- TraceOS
- CRM

目的：

- replayability
- causal inspection
- forensic analysis
- long-term cognition preservation
- AI-readable evolution tracking
- DGC-compatible semantic normalization
- CRM-ready reachability structure

---

## 1. Core Thesis

通常の AI workflow は、生成結果や会話ログを summary に圧縮しようとする。

しかし AgentRelay / EVLite において重要なのは、単なる summary ではない。

重要なのは：

```
巨大な曖昧 context
↓
意味を持つ atomic artifact
↓
DGC に変換可能な semantic unit
↓
CRM で到達可能性を制御できる graph node
````

である。

したがって本設計の中心原則は：

```
Summary is a view.
Atomic artifact is the substrate.
```

---

## 2. Why Granularity Matters

粒度が大きすぎる場合：

```
「全部まとめた巨大 report」
```

問題：

* 局所原因が追えない
* diff 不能
* AI が読みづらい
* replay 困難
* 変更点が埋もれる
* DGC node / edge に変換しづらい
* CRM の reachability 制御が粗くなる

粒度が小さすぎる場合：

```
「1行ごとの micro log」
```

問題：

* ノイズ爆発
* 文脈喪失
* 認知負荷増大
* 重要判断が埋もれる
* graph が過剰分解される
* relation の意味が希薄化する

したがって必要なのは：

```
適切な認知粒度
```

である。

---

## 3. Core Principle

```
Small artifacts preserve local causality.
Large artifacts preserve directional evolution.

Atomic artifacts preserve graphability.
Layered artifacts preserve cognition.
```

AgentRelay / EVLite / DGC は：

```
局所因果
+
大局的変遷
+
graph 化可能性
+
reachability 制御
```

を同時に保存することを目指す。

---

## 4. Relationship to AgentRelay

AgentRelay は artifact relay workflow である。

```
Agents hand over artifacts.
Humans commit.
```

AgentRelay の役割：

```
Human Request
  ↓
Planner Artifact
  ↓
Safety Artifact
  ↓
Execution Artifact
  ↓
Audit Artifact
  ↓
Human Decision Artifact
```

Artifact Granularity Design の役割：

```
AgentRelay が生成した artifact
↓
意味単位へ分解
↓
layer / kind / relation を付与
↓
DGC に変換可能な semantic unit に整形
```

つまり：

```
AgentRelay
= artifact lifecycle / workflow layer

Artifact Granularity
= semantic normalization / cognitive asset layer
```

---

## 5. Relationship to DGC

DGC は、判断・状態・関係を graph として扱う。

巨大な narrative report をそのまま DGC に接続するのは難しい。

理由：

* 複数の意味が混在する
* relation が曖昧
* claim 化しづらい
* edge の意味が不明瞭
* supersedes / depends_on / supports へ落としにくい

Artifact Granularity は、この問題を解決する。

```
handover.md / report.md
↓
semantic segmentation
↓
atomic artifact units
↓
candidate claims / candidate edges
↓
DGC-compatible graph units
```

### 5.1 Pre-Graph Semantic Normalization Layer

Artifact Granularity は DGC の前段に置かれる。

```
AgentRelay Artifacts
  ↓
Artifact Granularity
  ↓
Claim Extraction
  ↓
DGC Nodes / Edges
  ↓
TraceOS Events
```

この意味で Artifact Granularity は：

```
Pre-graph semantic normalization layer
```

である。

---

## 6. Relationship to CRM

CRM は reachability を扱う。

```
World = f(Graph, Actor, Context)
```

narrative blob のままだと、CRM は細かい到達制御ができない。

しかし artifact が適切な粒度で graph 化されていれば、以下が可能になる。

```
Executor:
  - implementation artifacts は読める
  - architecture rationale は限定的に読める
  - incident details は読めない

Auditor:
  - risk artifacts は読める
  - execution report は読める
  - unrelated design history は読めない

Architect:
  - architectural artifacts は読める
  - evolution artifacts も読める
  - micro lint artifacts は必要時のみ読む
```

つまり：

```
Artifact Granularity
↓
semantic isolation
↓
DGC graph
↓
CRM reachable worlds
```

である。

---

## 7. Artifact Granularity Layers

---

# Layer 1 — Micro Artifacts

## Purpose

局所変更・局所検証・局所監査。

## Examples

```
diff audit
verification result
lint report
small review note
single-risk warning
overreach detection
dependency side-effect warning
```

## Characteristics

* extremely localized
* highly replayable
* machine-friendly
* low context cost
* DGC edge candidate を作りやすい

## Example Questions

```
「なぜこの dependency を更新した？」
「この変更は要求範囲内か？」
「この diff は overreach か？」
```

## DGC Mapping

```
Micro Artifact
→ evidence node
→ supports / warns / contradicts / verifies edge
```

---

# Layer 2 — Implementation Artifacts

## Purpose

1つの実装タスク単位の記録。

## Examples

```
implementation report
execution report
handover report
task completion report
migration execution note
```

## Characteristics

* task-scoped
* human-readable
* AI-readable
* linked to modified areas
* AgentRelay の主要 artifact

## Example Questions

```
「この TODO で何を実装した？」
「どのファイルが変更された？」
「どんなリスクが残っている？」
```

## DGC Mapping

```
Implementation Artifact
→ task node
→ modifies / depends_on / produces / leaves_risk edge
```

---

# Layer 3 — Architectural Artifacts

## Purpose

設計判断・構造変更・方針転換を記録する。

## Examples

```
architecture decision
constitution update
design rationale
migration strategy
boundary policy
rejected alternative
risk acceptance
```

## Characteristics

* long-lived
* high semantic importance
* low frequency
* organization-level meaning
* future AI の判断境界になる

## Example Questions

```
「なぜ SQLite を採用した？」
「なぜ artifact relay 方式にした？」
「なぜ shared mutable cache を禁止した？」
「なぜ Role=ReachableWorld へ移行した？」
```

## DGC Mapping

```
Architectural Artifact
→ decision node / policy node
→ supersedes / depends_on / constrains / rejects / supports edge
```

---

# Layer 4 — Evolution Artifacts

## Purpose

プロジェクト全体の進化・思想変化・歴史を記録する。

## Examples

```
project evolution
ecosystem transition
historical milestone
major paradigm shift
release narrative
architecture epoch summary
```

## Characteristics

* civilization-scale memory
* historical replay
* timeline-oriented
* causally connective
* onboarding / archaeology に強い

## Example Questions

```
「このプロジェクトが AI-native 方向へ転換した分岐点は？」
「複雑性が増加した時期を特定して」
「いつから append-only 思想が中心になった？」
```

## DGC Mapping

```
Evolution Artifact
→ epoch node / transition node
→ derived_from / supersedes / influenced_by / caused_by edge
```

---

## 8. AgentRelay Integration Architecture

AgentRelay v0.2 では、Artifact Granularity を optional extension として接続できる。

```
Human Request
  ↓
request.md
  ↓
Planner
  ↓
01-plan.md
  ↓
Safety Verifier
  ↓
02-safety.md
  ↓
Executor
  ↓
03-execution/report.md
  ↓
Diff Auditor
  ↓
04-audit.md
  ↓
Human Commit
  ↓
05-decision.md
  ↓
Artifact Granularity Curator
  ↓
atomic artifacts / metadata / DGC candidates
```

---

## 9. Artifact Granularity Curator

Artifact Granularity Curator は、AgentRelay の後段に置かれる LLM-assisted component である。

役割：

```
report / handover を読む
↓
意味単位へ分解
↓
layer を分類
↓
artifact kind を付与
↓
frontmatter を提案
↓
DGC node / edge candidates を提案
```

重要：

```
LLM proposes.
Human or policy commits.
```

Curator は canonical graph を直接変更しない。

---

## 10. Suggested Frontmatter

```yaml
---
artifact_id: artifact:uuid
artifact_version: 0.2
layer: micro | implementation | architectural | evolution
artifact_kind: risk | audit | rationale | migration | decision | handover | verification | policy | rejection
source_run: trace:run-xxxx
source_step: planner | safety | executor | auditor | human_decision
status: proposed | approved | superseded | stale | archived
depends_on: []
related: []
supersedes: []
supports: []
contradicts: []
risk_level: none | low | medium | high | critical
stability: volatile | stable | constitutional
future_relevance: low | medium | high
dg_candidates:
  nodes: []
  edges: []
trace_refs: []
created_at: 2026-05-24
---
```

---

## 11. DGC Candidate Model

Artifact Granularity Curator may propose DGC candidates.

Example:

```yaml
dg_candidates:
  nodes:
    - id: claim:shared-cache-violates-workspace-isolation
      type: claim
      title: Shared mutable cache violates workspace isolation
      source_artifact: artifact:boundary-policy-001

    - id: decision:use-ephemeral-workspace
      type: decision
      title: Use ephemeral workspace-local state

  edges:
    - from: claim:shared-cache-violates-workspace-isolation
      to: decision:use-ephemeral-workspace
      type: supports

    - from: decision:use-ephemeral-workspace
      to: policy:no-shared-mutable-cache
      type: derives_from
```

These are candidates only.

```
Candidate graph
≠
Committed graph
```

Commit authority remains human / policy controlled.

---

## 12. Append-Only Principle

## Overwrite Documentation Problem

通常の上書き型 documentation：

```
README.md を更新
↓
過去の思考が消える
```

結果：

* why lost
* rejected alternatives disappear
* historical reasoning erased
* future AI cannot explain why not

---

## Append-Only Artifact Model

append-only model：

```
artifact 追加
↓
supersedes edge
↓
history preserved
```

結果：

* thought evolution preserved
* rejected paths preserved
* causal history replayable
* repo culture preserved
* AI can answer “why not?”

---

## 13. Artifact as Cognitive Assets

AgentRelay / EVLite において artifact は：

```
temporary logs
```

ではなく、

```
persistent cognitive assets
```

である。

Examples:

```
reports/
handovers/
runs/
constitutions/
prompts/
decisions/
policies/
migration-notes/
audit-reports/
```

これらは：

* human-readable
* AI-readable
* grepable
* diffable
* replayable
* model-agnostic
* graph-convertible
* reachability-controllable

である必要がある。

---

## 14. AI Forensics / Software Archaeology

Granular append-only artifacts により：

```
AI forensic analysis
```

が可能になる。

Examples:

```
「この設計が複雑化した分岐点を探して」
「この boundary policy が導入された理由を追跡して」
「この risk acceptance が後の問題に繋がったか？」
「なぜこの refactor は過去に拒否された？」
「なぜこの repo では shared mutable state を避ける？」
```

これは：

```
Git for source code
```

に対する：

```
Causal archaeology for cognition
```

である。

---

## 15. Why Not Just Summary?

Summary は有用だが canonical ではない。

```
Atomic artifacts = canonical substrate
Summary = generated view
```

Summary の問題：

* 局所因果が潰れる
* rejected alternatives が消える
* risk が丸められる
* DGC へ変換しづらい
* CRM で細かく制御できない

したがって：

```
Summaries are views.
Artifacts are substrate.
Graph is canonical structure.
```

---

## 16. Recommended Workflow

```
1. AgentRelay creates report / handover artifacts

2. Artifact Granularity Curator reads artifacts

3. Curator proposes:
   - layer
   - artifact_kind
   - tags
   - relation candidates
   - DGC node candidates
   - DGC edge candidates

4. EVLite stores proposed metadata

5. evlite validate checks:
   - orphan artifacts
   - stale artifacts
   - supersedes chains
   - missing dependencies
   - DGC candidate consistency

6. Human / policy approves important artifacts

7. Approved artifacts may be transformed into DGC nodes / edges

8. TraceOS records the proposal / approval / commit lifecycle
```

---

## 17. Ecosystem Mapping

```
AgentRelay
  = artifact workflow / role handover

Artifact Granularity
  = cognitive asset segmentation / semantic normalization

EVLite
  = artifact storage / metadata / validation / routing

DGC
  = canonical graph of decisions / claims / relations

TraceOS
  = append-only event history / replay

CRM
  = reachable world construction from graph

BurnScope
  = anomaly detection / cost and behavior observation

GlassBox
  = post-execution boundary verification

Constitution Engine
  = governance policy / role authority / commit rules
```

---

## 18. Architecture Diagram

```
                         ┌────────────────────┐
                         │    Human Request    │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │     AgentRelay      │
                         │ workflow / handover │
                         └─────────┬──────────┘
                                   │
                                   ▼
                  ┌────────────────────────────────┐
                  │ report.md / handover.md / audit │
                  └───────────────┬────────────────┘
                                  │
                                  ▼
                  ┌────────────────────────────────┐
                  │ Artifact Granularity Curator    │
                  │ segmentation / classification   │
                  └───────────────┬────────────────┘
                                  │
                                  ▼
                  ┌────────────────────────────────┐
                  │ Atomic Cognitive Artifacts      │
                  │ frontmatter + semantic units    │
                  └───────────────┬────────────────┘
                                  │
                                  ▼
                  ┌────────────────────────────────┐
                  │ DGC Candidate Layer             │
                  │ nodes / edges / relations       │
                  └───────────────┬────────────────┘
                                  │
                                  ▼
                  ┌────────────────────────────────┐
                  │ Human / Policy Commit           │
                  └───────────────┬────────────────┘
                                  │
                                  ▼
                  ┌────────────────────────────────┐
                  │ DGC Canonical Graph             │
                  └───────────────┬────────────────┘
                                  │
                                  ▼
                  ┌────────────────────────────────┐
                  │ CRM Reachable Worlds            │
                  └────────────────────────────────┘
```

---

## 19. Core Principle

```
Artifacts are not logs.
Artifacts are cognitive strata.

Granularity preserves causality.
Append-only preserves evolution.
Atomicity enables graph conversion.
Graph structure enables reachability.

AgentRelay produces artifacts.
Artifact Granularity normalizes artifacts.
DGC canonicalizes cognition.
CRM scopes cognition.
TraceOS replays cognition.

Git preserves code history.
Artifact layers preserve decision history.
DGC preserves causal structure.
```

---

*Artifact Granularity Design v0.2*
*Position: EVLite / AgentRelay Cognitive Asset Layer*
*Apache 2.0*
