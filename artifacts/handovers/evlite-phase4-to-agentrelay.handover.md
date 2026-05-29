---
ev_id: ev:handover.evlite-phase4-to-agentrelay
type: handover
title: "EVLite Phase 4 → AgentRelay v0.1 設計開始"
status: active
created_at: 2026-05-30
updated_at: 2026-05-30

goal: "EVLite Phase 4 を v0.1.4 として freeze し、AgentRelay v0.1 の設計を開始する"

current_state: |
  EVLite Phase 4 が完全に完了し v0.1.4 タグを打った。
  CHANGELOG / Freeze Report / Constitution v0.5 差分監査まで完了。
  次のセッションは AgentRelay v0.1 の設計から開始する。
  Constitution v0.6 は AgentRelay の輪郭が見えてから書く（先行しない）。

next_actions:
  - "ev:evlite.report-phase4-freeze を AgentRelay Constitution v0.1 の入力として使う"
  - "AgentRelay の core concept を定義する（task packet / relay report / agent output）"
  - "AgentRelay と EVLite の境界を明確にする"
  - "AgentRelay Constitution v0.1 を書く"

must_read:
  - "ev:evlite.report-phase4-freeze"
  - "ev:docs.llm-command-quick-reference"

optional_read:
  - "ev:evidence-vault-lite.TODO"

active_decisions:
  - "EVLite は軽いまま維持する。TraceOS直結はしない"
  - "AgentRelay が EVLite と TraceOS の中間層になる"
  - "Constitution v0.6 は AgentRelay 設計後に書く"

unresolved_questions:
  - "AgentRelay は独立リポジトリか、EVLite のパッケージか"
  - "task packet のスキーマは ContextPack を継承するか、独立型か"

known_risks:
  - "Constitution v0.6 を先に書くと AgentRelay の設計が先走りする"
  - "AgentRelay の責任範囲が曖昧なまま実装に入ると EVLite と重複する"

related_packs:
  - "pack:evlite-onboarding"

supersedes: []
superseded_by: []
tags:
  - phase4
  - freeze
  - agentrelay
  - handover
---

# EVLite Phase 4 → AgentRelay v0.1 ハンドオーバー

## 現在地

EVLite v0.1.4 が確定した。Phase 4 で実装したものは：

```
Repository Observability（DerivedTag / ImportanceScore / RiskSignal）
Context Compiler（evlite context / snapshot --deps / validate --affected）
Session Continuity（HandoverReport / EVReport / Prompt Vault）
```

これらは「Repository Observability / Context Compiler」として綺麗に閉じている。

## 次のセッションでやること

1. `ev:evlite.report-phase4-freeze` を読む
2. AgentRelay の core concept を定義する
3. AgentRelay Constitution v0.1 を書く

## レイヤー構造（確定）

```
EVLite     = 観測・記録・文脈コンパイル（軽い）
AgentRelay = 作業単位の受け渡し・追跡（中間層）
TraceOS    = append-only 台帳・証明（重い）
```

EVLite は AgentRelay に以下を渡す：
- `pack.md`（context）
- `EVReport`（execution record）
- `HandoverReport`（session continuity）
- `validate --show-risk` の出力（risk signals）

## Constitution v0.6 について

AgentRelay の設計が固まってから書く。先行しない。
