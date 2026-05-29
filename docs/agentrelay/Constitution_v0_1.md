---
ev_id: 'ev:agentrelay.constitution-v0-1'
type: constitution
stack: agentrelay
status: active
created_at: '2026-05-30T00:00:00.000Z'
updated_at: '2026-05-30T00:00:00.000Z'
tags:
  - constitution
  - agentrelay
supersedes: []
superseded_by: []
depends_on: []
related: []
---

# AgentRelay Constitution v0.1

> **Agents do not chat. Agents hand over artifacts.**

**Status:** Draft v0.1  
**License:** Apache 2.0  
**Position:** DGC Ecosystem — Workflow Layer  
**Supersedes:** —

---

## §0 Philosophy

AgentRelay は **work continuity protocol** である。

AI エージェントは会話しない。  
AI エージェントは構造化された artifact を受け取り、構造化された artifact を渡す。  
人間が最終的にコミットする。

```
AgentRelay does not store knowledge.
AgentRelay transfers work state.
```

AgentRelay の設計思想は DGC・TraceOS と同じ系譜に属する。

```
DGC         → Node / Edge / Commit が正典。Actor は二次的。
TraceOS     → DecisionEvent / EventEdge / Lineage が正典。App は二次的。
AgentRelay  → TaskPacket / AgentOutput / RelayReport が正典。Role は二次的。
```

誰がやるかより、**何が流れるか**が Constitution の中心である。

AgentRelay の仕様は抽象ドキュメントではなく Run Pack そのものである。

```
AgentRelay is a protocol as executed artifact trail.
The minimum spec of AgentRelay is the Run Pack itself:
  what was requested, what was read, what was done,
  what was carried forward, and how the human decided.
```

---

## §1 Position

AgentRelay は EVLite と TraceOS の中間層として機能する。

```
EVLite      = Context Compiler
              （観測・記録・文脈コンパイル）

AgentRelay  = Work Continuity Layer
              （作業単位の受け渡し・追跡）

TraceOS     = Provenance Layer
              （append-only 台帳・証明）
```

この三者は競合しない。それぞれが異なる問いに答える。

```
EVLite      → What context does this task need?
AgentRelay  → What work is being handed over?
TraceOS     → What happened and why?
```

DGC Ecosystem における AgentRelay の位置：

```
DecisionRoom  = 組織の意思決定・集合的審議（何を決めるか）
AgentRelay    = コーディング・実装タスクの relay（決まったことを安全に実装するには）
TraceLab.     = AI 探索・仮説検証・評価（何が正しいか）
```

AgentRelay は意図的に軽量である。  
AgentRelay はオーケストレーションフレームワークではない。  
AgentRelay はガバナンスシステムではない。

---

## §2 Core Principles

### Principle 1 — Work state, not knowledge

```
AgentRelay does not store knowledge.
AgentRelay transfers work state.
```

知識の保存は EVLite の責務である。  
証拠の記録は TraceOS の責務である。  
AgentRelay は作業状態の受け渡しのみを担う。

### Principle 2 — A task is a bounded unit of work

```
A task has exactly one request.
A task has exactly one commit (accept or reject).
A task does not spawn unbounded sub-tasks.
```

タスクの境界は Human Request から Human Commit（または Reject）までである。  
境界のないタスクは AgentRelay の対象外である。

### Principle 3 — Relay is a first-class artifact

```
RelayReport is not a log.
RelayReport is not a summary.
RelayReport is a structured artifact that carries work state forward.
```

RelayReport は次のタスクの入力になる。  
会話履歴は RelayReport の代替にならない。

### Principle 4 — Context and execution are separate concerns

```
Context compilation  → EVLite (pack.md / snapshot)
Work relay           → AgentRelay (TaskPacket / RelayReport)
```

EVLite は「何の文脈でこのタスクをやるか」を定義する。  
AgentRelay は「このタスクで何が起きたか」を受け渡す。  
この境界を崩してはならない。

### Principle 5 — Humans commit

```
AI proposes.
AI executes.
Humans commit.
```

AgentRelay の全ワークフローは Human Commit によって閉じる。  
自動コミットは AgentRelay の対象外である。

### Principle 6 — Artifacts over conversations

```
Conversations may assist exploration.
Artifacts remain canonical.
Artifacts are replayable.
Conversations are not.
```

会話は Planner フェーズでの探索に使われることがある。  
しかし canonical な作業状態は常に artifact に存在する。

### Principle 7 — Relay must be resumable

```
A RelayReport must contain enough structured state
for another agent or human to resume the work
without relying on prior conversation history.
```

会話履歴は失われる。モデルは変わる。エージェントは ephemeral である。  
RelayReport だけが次のタスクを開始できる唯一の canonical な引き継ぎ手段である。

### Principle 8 — Roles define reachable worlds

```
Role is not a prompt.
Role is not a personality.
Role = reachable documents + reachable files + allowed actions.
```

各エージェントは自分の TraceID に紐づいたスコープのみ読み書きできる。  
これにより、意図しないスコープ拡大を構造的に防ぐ。  
この原則は FlowOS・CRM・AgentRelay を貫く共通思想である。

### Principle 9 — Coordination is the bottleneck

```
The bottleneck in multi-agent systems is not intelligence.
The bottleneck is coordination cost.

Less synchronization.
More explicit handover.
```

AgentRelay は同期コスト・コンテキスト爆発・責任の曖昧さを  
artifact による明示的な受け渡しで解消する。  
これが LangGraph・AutoGen 等のオーケストレーション型フレームワークとの本質的な差異である。

---

## §3 Workflow

AgentRelay は artifact flow として作業継続をモデル化する。

```
Task Request
  ↓
Task Packet
  ↓
Execution
  ↓
Agent Output
  ↓
Relay Report
  ↓
Next Task (or Close)
```

各ステップは artifact の生成・消費で定義される。  
誰が（どのエージェントが）各ステップを担うかは派生的な関心事である。

### §3.1 Role Projection

artifact flow に乗る役割の標準セット：

```
Planner           → creates Task Packet
Safety Verifier   → validates Task Packet
Executor          → produces Agent Output
Diff Auditor      → reviews Agent Output
Human Commit      → accepts or rejects Relay Report
```

この Role セットは AgentRelay が要求する唯一の構成ではない。  
最小構成（例：Human → Executor → Human Commit）も有効なワークフローである。

Role が何であれ、流れる artifact は同じである：

```
Task Packet → Agent Output → Relay Report
```

### §3.2 Run の定義

1つの Run = Task Request から Human Commit（または Reject）までの作業単位。

```
Run は TraceID で識別される。
Run はネストしない。
Run は並列に存在できる。
```

---

## §4 Artifact Types

v0.1 では artifact の**責務**を定義する。  
スキーマ（型定義・JSON Schema）は v0.2 以降に定義する。

### TaskPacket

```
TaskPacket is a bounded unit of work expressed as an artifact.
```

- Human Request から生成される
- Execution に必要な文脈・制約・スコープを含む
- EVLite の pack.md を文脈として取り込むことができる
- TaskPacket が確定した時点で Run が開始する

### AgentOutput

```
AgentOutput is the result of execution within the Run's scope.
```

- Executor が生成する
- Run のスコープ内でのみ有効
- Human Commit の前に Diff Auditor によってレビューされる（任意）

### RelayReport

```
RelayReport carries work state to the next task or to close.
```

- 作業状態・残存リスク・未解決問題を含む
- 次のタスクの TaskPacket の入力になりうる
- Human Commit の記録を含む
- RelayReport が生成された時点で Run が閉じる

> **未解決：** TaskPacket のスキーマは EVLite ContextPack を継承するか、独立型か。  
> この問いは v0.2 のスキーマ定義フェーズで解決する。

---

## §5 Isolation Rules

### §5.1 Scope isolation

各 Run は TraceID で識別されたスコープを持つ。

```
Executor は Run のスコープ外を変更してはならない（MUST NOT）。
Diff Auditor はスコープ外の変更を検出したら flag を立てる（MUST）。
Human Commit はスコープ外変更が存在する場合に差し戻すことができる（MAY）。
```

### §5.2 Role isolation

```
Planner は mutation を行ってはならない（MUST NOT）。
Executor は Planner の推論を再実行してはならない（MUST NOT）。
Auditor は修正を加えてはならない（MUST NOT）。
```

### §5.3 Context isolation

```
AgentRelay core MUST NOT depend on EVLite internals.
AgentRelay core MUST NOT depend on TraceOS.
TraceOS emission MAY be implemented by an adapter layer.
```

EVLite との境界：

```
EVLite     → context の読み取り・構造化（read）
AgentRelay → context を消費して artifact を生成（consume and produce）
```

TraceOS への記録が必要な場合、AgentRelay core ではなく adapter が担う。  
この分離により、AgentRelay core は TraceOS の存在を知らなくてよい。

---

## §6 Non-Goals

AgentRelay が担わないこと：

```
AgentRelay is not a memory system.
→ Session continuity is represented by RelayReport, not by implicit agent memory.
  長期記憶の管理は EVLite・TraceMemory・TraceOS が担う。

AgentRelay is not a document repository.
→ EVLite が担う。

AgentRelay is not a provenance ledger.
→ TraceOS が担う。

AgentRelay is not an orchestration framework.
→ エージェントの起動・スケジューリングは外部層が担う。

AgentRelay is not a real-time coordination system.
→ エージェントはリアルタイムに同期しない。

AgentRelay is not a decision governance system.
→ DecisionRoom が担う。

AgentRelay is not a knowledge base.
→ 知識の蓄積は AgentRelay の責務ではない。
```

これらの責務が AgentRelay に混入した場合、Constitution 違反として扱う。

---

## §7 Open Questions（v0.1 時点）

v0.1 では以下を意図的に未解決のままにする：

```
Q1: AgentRelay は独立リポジトリか、EVLite のパッケージか。
    → 【暫定決定】Phase 1 は EVLite package として実装する。
      現在の Run Pack / HandoverReport / EVReport が EVLite artifact に依存しており、
      EVLite package が設計検証に最も適している。
      agentrelay-core への切り出しは MVP Run 実験後に判断する。

Q2: TaskPacket のスキーマは EVLite ContextPack を継承するか、独立型か。
    → v0.2 のスキーマ定義フェーズで決定する。

Q3: RelayReport の TraceOS emit タイミング（Run 完了時か、ステップごとか）。
    → 実装仕様として v0.2 以降で決定する。
```

---

## §8 Versioning

この Constitution はバージョン管理される。  
変更は明示的な supersedes チェーンで追跡される。

```
Breaking change  → メジャーバージョン変更（v0.1 → v0.2）
Clarification    → マイナー変更（補足・注釈の追加）
```

§2 Core Principles および §6 Non-Goals への変更は Breaking change として扱う。

---

_AgentRelay Constitution v0.1_  
_Supersedes: —_  
_Apache 2.0_  
_作成: 2026-05-30_  
_Status: Frozen — Derived from AgentRelay Overview v0.1_
