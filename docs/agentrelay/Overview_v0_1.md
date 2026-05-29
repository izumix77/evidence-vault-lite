---
ev_id: 'ev:agentrelay.AgentRelay — Overview v0.1'
stack: agentrelay
status: active
tags:
  - overview
depends_on:
  - 'ev:AgentRelay.constitution-v0-1'
related:
  - 'ev:AgentRelay.AgentRelay — AI-Native Artifact Relay Workflow (Concept Draft)'
  - 'ev:AgentRelay.Artifact Granularity Design — Cognitive Asset Layer v0.2'
supersedes: []
---

# AgentRelay — Overview v0.1

> **「Agents hand over artifacts. Humans commit.」**

**Status:** Draft v0.1
**License:** Apache 2.0
**Position:** DGC Ecosystem — Workflow Layer
**Supersedes:** —

---

## 0. 一言で言うと

AgentRelay は **TraceID で境界を引いた artifact relay workflow** である。

AI エージェントはリアルタイムに会話しない。
構造化された artifact を渡し合い、人間が最終的にコミットする。

```
Agents do not continuously synchronize.
Agents hand over structured artifacts.
Agents are ephemeral.
Artifacts persist.
Humans commit.
```

会話は探索や補助に使われることがある。しかし artifact が canonical である。

```
Conversations may assist exploration.
Artifacts remain canonical.
```

---

## 1. なぜ AgentRelay が必要か

### 現在の多くのマルチエージェントシステムの問題

```
Agent A → Agent B → Agent C → Agent A → ...（ループ）

問題：
  - やりとりが無限に続く（トークン消費が止まらない）
  - 何が決まったか誰も知らない
  - 責任の境界が曖昧
  - replay できない
  - 観測できない
```

### AgentRelay のアプローチ

```
artifact → review → artifact → review → Human Commit

特徴：
  - やりとりが有限（artifact を渡したら終わり）
  - 何が決まったかが artifact に残る
  - 責任の境界は TraceID で明確
  - append-only で replay 可能
  - 全ステップが観測可能
```

---

## 2. Core Philosophy

### 2-1. Coordination is the real bottleneck

マルチエージェントシステムの本質的な問題は知性ではなく、**調整コスト**である。

```
同期コスト
コンテキスト爆発
責任の曖昧さ
制御されない探索
隠れた副作用
観測性の喪失
```

Therefore:

```
Less synchronization.
More explicit handover.
```

### 2-2. Artifacts over conversations

| 会話 | Artifact |
|------|----------|
| 一時的 | 静的 |
| replay 困難 | reviewable |
| スコープが広がる | compressible |
| 監査しにくい | reproducible |

会話は探索フェーズや人間のトリガーとして有用である。
ただし会話は canonical ではない。artifact が canonical である。

### 2-3. Role = ReachableWorld

AgentRelay における Role の定義:

```
Role ≠ personality
Role ≠ prompt
Role = reachable documents + reachable files + allowed actions
```

各エージェントは自分の TraceID に紐づいたフォルダのみ読み書きできる。
これにより、意図しないスコープ拡大を構造的に防ぐ。

この原則は FlowOS の

```
Role is not a prompt. Role is a reachable world.
```

と完全に一致する。

### 2-4. Why cheap matters

AgentRelay は意図的に以下を最適化する:

```
AgentRelay intentionally optimizes for:
  - low infrastructure      高価なインフラ不要
  - low synchronization     リアルタイム同期不要
  - subscription-native     既存の AI subscription を relay で編成
  - model-agnostic          特定モデルに依存しない
```

既存の多くの agent framework はインフラ前提で設計されている。
AgentRelay は AI subscription を relay で編成するだけで動く。

```
高価なオーケストレーションインフラ
↓ 不要
既存の AI subscription を relay で編成
↓
AgentRelay が動く
```

これは個人開発者・スタートアップにとって本質的な差別化点である。

---

## 2-5. Cognitive assets over tool-specific artifacts

道具は変わる。認知資産は残る。

```
LangGraph を使った場合:
  LangGraph の graph 定義 → LangGraph 専用資産
  バージョンが変わったら → 負債になる

AgentRelay の場合:
  artifact（.md）→ どこでも読める
  Constitution   → どの AI にも渡せる
  EVReport       → 永久に replay 可能
  Run Pack       → モデルが変わっても使える
```

蓄積されるのはコードではなく**認知資産**である。

```
なぜこう決めたか
何を考慮したか
どのリスクを検討したか
```

これは LangGraph のグラフ定義には残らない。

```
道具が変わっても → Constitution は残る
モデルが変わっても → HandoverReport は残る
バージョンが上がっても → EVReport は残る
フレームワークが消えても → Run Pack は残る
```

**資産の寿命が道具の寿命に依存しない。**
これが artifact-first の本質的な恩恵である。

---

## 3. TraceID による境界設計

### 3-1. Run の識別

```
TraceID: trace:run-{uuidv7}

例: trace:run-20260521-001
```

1つの Run = 1つの作業単位（Human Request から Human Commit まで）。

### 3-2. フォルダ境界

```
.ev-lite/runs/trace:run-20260521-001/
  request.md         ← Human が書く
  01-plan.md         ← Planner のみ書ける
  02-safety.md       ← Verifier のみ書ける
  03-execution/      ← Executor のみ触れる
  04-audit.md        ← Auditor のみ書ける
  05-decision.md     ← Human が書く（Commit）
```

各エージェントは:
- **自分のフォルダのみ書ける**
- **前ステップの artifact のみ読める**
- **次ステップの artifact はまだ存在しない**

### 3-3. TraceOS との連携

各ステップの read / write は TraceOS に記録される。

```
「このエージェントがこのファイルを読んだ」
「このエージェントがこのファイルを書いた」
```

後から以下が replay 可能になる:
- なぜこの判断になったか
- どの情報を見て決めたか
- どのステップで何が変わったか

---

## 4. 基本ワークフロー

```
Human Request
  ↓ request.md を作成
Planner
  ↓ 01-plan.md を生成（広く考える / 代替案を出す）
Safety Verifier
  ↓ 02-safety.md を生成（境界・権限・スコープを検証）
Executor
  ↓ 03-execution/ に実装結果を生成（狭く確定的に動く）
Diff Auditor（Post-Execution Boundary Verification）
  ↓ 04-audit.md を生成（要求と実際の差分を検証 / overreach 検査）
Human Commit
  ↓ 05-decision.md を作成（承認 / 差し戻し）
```

---

## 5. Role 定義

### Planner

```
目的: 探索・代替案・設計推論・失敗シミュレーション
許可: 広い推論 / アーキテクチャ分析 / 提案生成
禁止: mutation / commit / 制約なしの実行
```

Planner は意図的に「広く考えることを許される」。
会話フェーズはここで最も活用される。

### Safety Verifier

```
目的: 境界検証 / ポリシー検証 / スコープ検証
チェック項目:
  - 予期しないファイルアクセス
  - 未承認パスへのアクセス
  - 権限昇格
  - 危険な外部アクション
  - ポリシー違反
```

### Executor

```
目的: 確定的な実行 / 承認済みの変更のみ
原則: creativity を最小化する
実行対象: 承認済みプラン + 承認済みファイルスコープ + 承認済みアクション
```

### Diff Auditor（Post-Execution Boundary Verification）

```
目的: 実行後の reachability / overreach 検査
チェック: 要求された変更 vs 実際の変更

例:
  要求: README の更新
  実際: README + package.json + lockfile
  → フラグを立てる
```

単なるコードレビューではなく、実行後の境界検証として機能する。
GlassBox との接続点にもなる。

### Human Commit Authority

```
AI が担うこと: propose / review / execute / audit
人間が担うこと: 最終的な意思決定と責任
```

---

## 6. EVLite との統合

AgentRelay は EvidenceVault Lite と自然に統合される。

### Run Pack 構造

```
.ev-lite/
  runs/
    trace:run-20260521-001/
      request.md
      01-plan.md        ← HandoverReport（plan）
      02-safety.md      ← EVReport（report_kind: analysis）
      03-execution/
        report.md       ← EVReport（report_kind: implementation）
      04-audit.md       ← EVReport（report_kind: analysis）
      05-decision.md    ← HandoverReport（decision）
```

### Commit vs Run Pack

```
Git Commit = 何が変わったか（result）
Run Pack   = なぜ変わったか（causal story）
           = 何を考慮したか
           = 何を却下したか
           = どのリスクを検討したか
```

### evlite validate との連携

```
evlite validate --show-impact trace:run-xxx
→ この Run で参照された全ドキュメントの影響範囲を表示

evlite validate --show-chains
→ supersedes チェーンで Run の履歴を追跡
```

---

## 7. エコシステムとのマッピング

```
Human Request         → EVLite pack（文脈の構造化）
TraceID 発行          → TraceID Registry
artifact 記録         → TraceOS
境界定義              → DGC Constitution
文書管理              → EVLite（HandoverReport / EVReport）
Human Commit          → DecisionRoom
監視・異常検知        → BurnScope ObserverAI
```

AgentRelay は新しいシステムではなく、**既存エコシステムの各層を workflow として繋ぐもの**である。

---

## 8. 現在の運用（手動 AgentRelay）

現時点では以下の手動運用が行われている:

```
Human が pack.md を作る        ← Planner
Human がコピペして渡す          ← Router（手動）
Claude Chat で設計議論          ← Planner / Verifier
Claude Code で実装              ← Executor
Human が git diff を確認        ← Diff Auditor
Human が commit する            ← Human Commit
```

```
evlite validate                 ← Safety Verifier（部分的）
Constitution                    ← Policy Engine
```

この手動運用が動いていること = **設計が正しい証拠**。
自動化はこの手動運用を機械に渡すだけである。

---

## 9. 自動化の方向性

### トリガーの自動化

```
現在: Human がコピペして渡す
目標: pack.md が生成されたら Agent が自動で読んで実行開始
```

例えば:
```
evlite pack pack:my-task
→ pack.md が .ev-lite/packs/ に生成
→ Claude Code が watch して自動実行開始
→ EVReport を生成して返す
```

### Slack / 外部トリガー

```
Slack に繋いだとしたら:
「指示文書来てるので読んで実行してください」
というトリガーを与えるだけで十分
```

AgentRelay においてメッセンジャーは**トリガー**であり、**会話の場**ではない。

---

## 11. Positioning — 他コンポーネントとの関係

AgentRelay は意図的に**軽量**である。

```
AgentRelay is intentionally lightweight.
It is designed for coding and implementation tasks,
not for organizational governance (DecisionRoom)
or experimental exploration (TraceLab.).
```

### エコシステム内での役割分担

| コンポーネント | 対象 | 主な問い |
|---|---|---|
| DecisionRoom | 組織の意思決定・集合的審議 | 何を決めるか |
| TraceLab. | AI 探索・仮説検証・評価 | 何が正しいか |
| AgentRelay | コーディング・実装タスク | 決まったことを安全に実装するには |

### 直列の流れ

```
DecisionRoom で方針を決める
  ↓
AgentRelay で実装する
  ↓
TraceLab. で評価・検証する
```

三者は競合しない。AgentRelay は「実装フェーズの workflow」として機能する。

---

## 10. Artifact Granularity and DGC Candidate Projection

AgentRelay は artifact の **transport / execution relay** である。
生成された artifact の意味をどう canonicalize するかは、別の層が担う。

### 責務分離

```
Agent Runtime
  ↓
AgentRelay          = transport / execution relay
  ↓
EVReport            = artifact registry / provenance（EVLite）
  ↓
Artifact Granularity Curator  = semantic normalization layer
  ↓
DGC Candidate Graph = proposed nodes / edges
  ↓
Human Commit        = canonical graph への昇格
  ↓
DGC                 = canonical meaning graph
  ↓
CRM                 = reachable worlds
```

### 今すぐできること — frontmatter semantic normalization

AI Curator がなくても、EVReport の frontmatter に semantic metadata を付与することで
将来の意味構造に接続できる状態を維持できる。

```yaml
layer: implementation          # micro / implementation / architectural / evolution
artifact_kind: implementation  # incident / audit / rationale / decision / handover / ...
stability: draft               # volatile / stable / constitutional
risk_level: medium             # none / low / medium / high / critical
```

これだけで:

```
scan → registry への登録
filtering → layer / kind による絞り込み
graph projection → DGC candidates の生成
future curator training → semantic normalization の学習データ
```

に効いてくる。

### Human Commit Boundary の維持

Artifact Granularity Curator は DGC candidates を**提案**するだけである。

```
Curator proposes.
Humans commit.
```

この原則を崩すと DGC がただの embedding sludge になる。
AgentRelay の `Humans commit.` 原則はここでも維持される。

### Artifact Granularity Design との関係

詳細は `Artifact Granularity Design v0.2` を参照。

```
AgentRelay Overview    = workflow / transport layer の定義
Artifact Granularity   = semantic normalization layer の定義
```

---

## 12. 将来の拡張

```
Scheduler Agents（優先度に基づく自動 routing）
Cost-aware routing（モデル選択の最適化）
Adaptive constitutions（Run の種類に応じた Constitution の切り替え）
BurnScope integration（異常な Run の自動検知）
TraceOS event generation（全ステップの自動記録）
Constitution Engine integration（ポリシー検証の自動化）
GlassBox integration（Post-Execution Boundary Verification の自動化）
```

---

## 13. Core Principle

```
Agents do not chat. Agents hand over artifacts.
Agents are ephemeral. Artifacts persist.
Artifacts are replayable. Conversations are not.
Conversations may assist exploration. Artifacts remain canonical.
Roles define reachable worlds, not personalities.
Humans commit. AI proposes.
Coordination is the bottleneck. Artifacts reduce coordination.
Infrastructure is optional. Subscription is enough.
```

---

_AgentRelay Overview v0.1_
_Apache 2.0_
_Position: DGC Ecosystem — Workflow Layer_
_作成: 2026-05-22_
