---
ev_id: 'ev:docs.Constitution_v0_5'
stack: docs
status: active
tags: []
depends_on: []
related: []
supersedes:
  - 'ev:docs.Constitution_v0_4'
---

# EvidenceVault Lite — Constitution v0.5

> **「AIに必要な文脈だけを、構造的に渡す」**

**Status:** Constitution v0.5
**Supersedes:** Constitution v0.4
**License:** Apache 2.0
**Position:** AI Collaboration Memory Infrastructure — DGC Ecosystem Application Layer
**Repository:** `evidence-vault-lite`（独立リポジトリ）

---

## 0. 設計原則

```
EvidenceVault Lite does not search for relevance.
EvidenceVault Lite routes context by human-defined structure.
Truth about what to read emerges outside the system.
```

- **Canonical Context Routing** — similarity search ではなく、人間が「これを読め」を定義する
- **JSON = 正本 / Markdown = AI転送フォーマット** — 二層構造を常に維持する
- **DGC topology 思想** — `supersedes` / `status` から `effectiveStatus()` を導出する
- **metadata preservation** — frontmatter は破壊的に消さない。append-only history は Phase 4 以降
- **kernel neutrality** — core はスキャン・パース・グラフ構築のみ。意味の判断は外部
- **server = HTTP adapter** — business logic は core に置く。server は薄い変換層に徹する
- **snapshot = code transfer artifact** — snapshot は転送用。source files が正本
- **prompt = dependency-aware executable intention** — 実装指示は依存グラフを持つ構造化意図である
- **importance emerges from usage** — 文書の重要度は手動 priority だけでなく usage topology から導出する
- **derived tags are read-only** — Auto Tag は registry に付与するが frontmatter に書き戻さない

---

## 0.1 ポジションの拡張

Constitution v0.3 まで EvidenceVault Lite は **AI Context Transfer Tool** として設計された。
Constitution v0.4 においてポジションを **AI Collaboration Memory Infrastructure** に拡張した。
Constitution v0.5 において、Artifact の種類を拡張し、認知状態の完全なライフサイクル管理を正式に定義する。

```
AI Collaboration Memory Infrastructure
```

Git が「何が変わったか」を保存するのに対し、EvidenceVault Lite は：

```
なぜその変更をしたか
AI がどう解釈したか
何を読んで実装したか
何を避けたか
セッション間で何を引き継ぐか
どの矛盾が未解決か
```

を保存する。これは Git とは完全に別レイヤーの記録システムである。

### Document → Instruction → Execution → Reflection

```
Document    = 仕様・設計書（ev:stack.spec）
Instruction = AI への実装指示（pack:impl-xxx）
Execution   = AI の実装レポート（ev:stack.report-xxx）
Reflection  = 次の Instruction の文脈（depends_on / related）
Handover    = セッション間の認知状態の引き継ぎ（ev:handover.xxx）
```

この5つが全て「参照可能な構造化文脈」として統一される。

---

## 1. リポジトリ構成

（v0.4 から変更なし）

```
evidence-vault-lite/
  apps/
    evlite-ui/          ← Vite + React（Metadata Editor / Pack Builder / Snapshot Builder）
  packages/
    shared/             ← 共有型定義・zod スキーマ
    core/               ← 純ロジック（scan / parse / registry / pack / snapshot / favorites）
    server/             ← HTTP adapter（Hono）
    cli/                ← terminal UX（commander）
  docs/
  package.json          ← pnpm workspace root
```

### パッケージ責務

| パッケージ | 責務 | 外部依存 |
|---|---|---|
| `@ev-lite/shared` | 型定義・zod スキーマ | zod のみ |
| `@ev-lite/core` | scan / parse / registry / pack / snapshot / favorites 生成 | gray-matter, remark, fast-glob, fs-extra |
| `@ev-lite/server` | HTTP adapter（Hono）| hono, @ev-lite/core |
| `@ev-lite/cli` | CLI UX | commander, picocolors, @ev-lite/core, @ev-lite/server |
| `evlite-ui` | Metadata Editor + Pack Builder + Snapshot Builder | React, Vite |

---

## 2. 中心概念

### 2.1 EvidenceNode

registry の基本単位。Phase 1 では 1ファイル = 1 EvidenceNode。Phase 4 で section index に拡張予定。

```ts
type EvidenceNodeKind = "file" | "section"  // Phase 4 で section index に拡張予定

type EvidenceNode = {
  ev_id:        string | null
  kind:         EvidenceNodeKind
  path:         string
  anchor?:      string
  stack?:       string
  status?:      EvidenceStatus
  tags:         string[]
  derived_tags?: DerivedTag[]    // Auto Tag 導出結果（read-only、scan 時に付与）
  depends_on:   string[]
  related:      string[]
  supersedes:   string[]
  title?:       string
  excerpt?:     string
  importance?:  ImportanceScore  // Phase 4 — reference_count 集計後に付与
}
```

### 2.2 EvidenceStatus

```ts
type EvidenceStatus =
  | "active"       // 現行仕様 — Context Pack に含める
  | "draft"        // 草案 — 明示指定時のみ含める
  | "experimental" // 実験中 — 明示指定時のみ含める
  | "deprecated"   // 非推奨 — 警告を出す
  | "archived"     // 履歴保管 — 含めない
  | "superseded"   // 他の artifact に置き換えられた — 含めない（supersedes topology から導出可）
  | "stale"        // 明示的に陳腐化マーク — 警告を出す（HandoverReport / EVReport で使用）
```

> **注:** `superseded` は `effectiveStatus()` によって topology から導出されるが、
> frontmatter に明示記述することも許容する（ObserverAI が依存している文書に対して人間が明示する場合）。

### 2.3 ContextPack

AIに渡す目的別コンテキスト束。Prompt Vault においては実装指示書としても機能する。

```ts
type ContextPack = {
  id:          string     // "pack:{name}"
  goal:        string     // このPackで何を達成するか / AI への指示の目的
  mustRead:    string[]   // ev_id[] — 必ず含めるノード。配列の順序が context routing の順序
  doNotInfer:  string[]   // AIに推論させてはいけない事項 / 制約
  outputGoal:  string[]   // AIに期待する出力
  status?:     "active" | "draft"
}
```

> **`mustRead` は順序付きコンテキストであり、unordered set ではない。**
> AI は先に読んだ文脈に強く引っ張られるため、順序は context routing の一部として扱う。
> pack.md 生成時は `mustRead` 配列の順序をそのまま採用する。

### 2.4 SnapshotDoc

コードリポジトリ / パッケージを一枚の .md に変換したもの。（v0.4 から変更なし）

```ts
type SnapshotDoc = {
  title:       string
  sourcePath:  string
  generatedAt: string
  tree:        string
  files:       SnapshotFile[]
}

type SnapshotFile = {
  path:     string
  language: string
  content:  string
}
```

### 2.5 HandoverReport ※v0.5 新規追加

セッション間の作業継続のための context artifact。
単なる「申し送り」ではなく、現在の認知状態を圧縮した構造化アーティファクトとして扱う。

```ts
type HandoverReport = {
  id: string                    // "ev:handover.{name}"
  type: "handover"
  title: string
  created_at: string            // ISO 8601
  updated_at?: string

  goal: string                  // セッションの目標
  current_state: string         // 現在の作業状態の要約
  next_actions: string[]        // 次に実行すべきアクション

  must_read: string[]           // ev_id[] — 次のセッションで必須の文書
  optional_read?: string[]      // ev_id[] — 任意参照文書

  active_decisions?: string[]   // 現在有効な決定事項
  unresolved_questions?: string[] // 未解決の問い
  known_risks?: string[]        // 既知のリスク

  related_packs?: string[]      // pack:{name}[]
  related_docs?: string[]       // ev_id[]

  status: EvidenceStatus        // "active" | "stale" | "superseded" | "archived"
  freshness?: "new" | "recent" | "normal" | "old"  // Auto Tag 導出元

  supersedes?: string[]         // ev_id[] — 置き換える旧 HandoverReport
  superseded_by?: string[]      // ev_id[] — この HandoverReport を置き換えた新しいもの

  metadata?: {
    reference_count?: number
    last_referenced_at?: string
    generated_by?: string       // 生成エージェント or "human"
    generated_at?: string
  }
}
```

**設計原則:**
- `must_read` の ev_id は `evlite validate` の依存グラフ対象に含める
- `supersedes` / `superseded_by` は `effectiveStatus()` の対象
- `HandoverReport` は append-only。古い handover は `archived` にするが削除しない

### 2.6 EVReport ※v0.5 新規追加

「何が変わったか」ではなく「認知トポロジーが何を変えたか」を記録するセマンティック観測アーティファクト。
Constitution v0.4 で言及された "Implementation Report" の型定義を正式化し、上位互換として定義する。

```ts
type EVReport = {
  id: string                    // "ev:{stack}.report-{name}"
  type: "report"
  report_kind: EVReportKind
  title: string
  created_at: string
  updated_at?: string
  status: EvidenceStatus        // "active" | "draft" | "superseded" | "archived"

  goal?: string
  modified_areas?: string[]
  semantic_impact?: string[]
  architectural_consequences?: string[]
  remaining_risks?: string[]
  known_assumptions?: string[]
  unresolved_contradictions?: string[]  // AI は矛盾を暗黙に解消するため明示保存が重要

  required_packs_for_continuation?: string[]  // pack:{name}[] — 続行に必要な Context Pack
  suggested_next_actions?: string[]
  related_reports?: string[]

  supersedes?: string[]
  superseded_by?: string[]
  tags?: string[]

  metadata?: {
    reference_count?: number
    used_in_packs?: number
    used_by_agents?: number
    last_referenced_at?: string
  }
}

type EVReportKind =
  | "implementation"   // AI の実装レポート（旧 Implementation Report と同義）
  | "analysis"         // 分析レポート
  | "architecture"     // アーキテクチャ決定レポート
  | "research"         // 調査レポート
  | "incident"         // インシデントレポート
  | "observer"         // ObserverAI 生成レポート
  | "retrospective"    // 振り返りレポート
```

**設計原則:**
- `unresolved_contradictions` は意図的な保存。AI が矛盾を「解決済み」と誤認しないようにするため
- `required_packs_for_continuation` によりレポートが「文脈ルーティングノード」として機能する
- `report_kind: "implementation"` は Constitution v0.4 の "Implementation Report" の完全な上位互換

### 2.7 ImportanceScore ※v0.5 新規追加

文書の重要度を usage topology から導出するスコア。手動 priority と derived score は分離する。

```ts
type ImportanceScore = {
  explicit_priority?: number    // 人間が設定（0.0〜1.0）。derived 値を上書きしない
  reference_count?: number      // 他 node からの参照数（scan 時に集計）
  pack_dependency_count?: number // 含まれる pack 数
  recent_reference_count?: number // 直近 30 日の参照数
  last_referenced_at?: string
}
```

**kernel neutrality の適用:** `ImportanceScore` の解釈（どのスコアが「重要」か）は外部層（UI / ObserverAI）が判断する。core は集計のみ行う。

### 2.8 DerivedTag ※v0.5 新規追加

メタデータと usage topology から自動導出されるタグ。frontmatter には書き戻さない（read-only）。

```ts
type DerivedTag =
  // Freshness Tags（更新日から導出）
  | "NEW"          // updated_at が 30 日以内
  | "RECENT"       // updated_at が 90 日以内（NEW でない）
  | "OLD"          // 1年以上更新なし
  | "STALE"        // status === "stale" の明示指定

  // Lifecycle Tags（status から導出）
  | "ACTIVE"
  | "SUPERSEDED"
  | "ARCHIVED"
  | "EXPERIMENTAL"

  // Usage Tags（ImportanceScore から導出 — Phase 4 後半）
  | "HOT"          // recentReferenceCount が高い
  | "CORE"         // reference_count >= 10
  | "COLD"         // 最近の参照が少ない
  | "FOUNDATIONAL" // OLD かつ reference_count >= 10
```

**導出ルール:**

```ts
function deriveTags(doc: EvidenceNode): DerivedTag[] {
  const tags: DerivedTag[] = []

  // Freshness
  if (updatedWithinDays(doc, 30)) tags.push("NEW")
  else if (updatedWithinDays(doc, 90)) tags.push("RECENT")
  if (notUpdatedForDays(doc, 365)) tags.push("OLD")

  // Lifecycle
  if (doc.status === "stale") tags.push("STALE")
  if (doc.status === "superseded") tags.push("SUPERSEDED")
  if (doc.status === "active") tags.push("ACTIVE")
  if (doc.status === "archived") tags.push("ARCHIVED")
  if (doc.status === "experimental") tags.push("EXPERIMENTAL")

  // Usage（ImportanceScore が集計済みの場合のみ）
  const imp = doc.importance
  if (imp) {
    if ((imp.reference_count ?? 0) >= 10) tags.push("CORE")
    if (referencedRecentlyOften(imp)) tags.push("HOT")
    if (notUpdatedForDays(doc, 365) && (imp.reference_count ?? 0) >= 10) tags.push("FOUNDATIONAL")
  }

  return tags
}
```

### 2.9 RiskSignal ※v0.5 新規追加

ObserverAI / BurnScope へ渡すリスク検出シグナル。`evlite validate` の出力に含める。

```ts
type RiskSignalType =
  | "stale_dependency"     // pack/report/handover の must_read/depends_on が OLD/STALE な文書を参照
                           // ※ agent usage 履歴による検出は Phase 5
  | "knowledge_bottleneck" // 複数エージェントが同一 SUPERSEDED pack に依存
  | "semantic_monoculture" // HOT 文書が canonical でない

type RiskSignal = {
  type: RiskSignalType
  affected_ids: string[]   // ev_id[] or pack:{name}[]
  detail: string
}
```

---

## 3. Frontmatter 仕様

### 3.1 基本形式（document / snapshot）

```yaml
---
ev_id: ev:{stack}.{name}
stack: {stack}
status: draft | active | experimental | deprecated | archived | superseded | stale
tags: []
depends_on: []
related: []
supersedes: []
---
```

### 3.2 HandoverReport frontmatter ※v0.5 新規追加

```yaml
---
ev_id: ev:handover.{name}
type: handover
title: {タイトル}
status: active | stale | superseded | archived
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD

must_read:
  - ev:{stack}.{name}
optional_read: []

active_decisions: []
unresolved_questions: []
known_risks: []

related_packs: []
related_docs: []

supersedes: []
superseded_by: []

tags: []
---
```

### 3.3 EVReport frontmatter ※v0.5 新規追加

```yaml
---
ev_id: ev:{stack}.report-{name}
type: report
report_kind: implementation | analysis | architecture | research | incident | observer | retrospective
title: {タイトル}
status: active | draft | superseded | archived
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD

required_packs_for_continuation: []
supersedes: []
superseded_by: []

tags: []
---
```

### 3.4 フィールド規則

| フィールド | MUST/SHOULD/MAY | 説明 |
|---|---|---|
| `ev_id` | MUST | グローバル一意。`ev:{stack}.{name}` 形式 |
| `stack` | MUST | 所属スタック（`handover` は stack 兼用） |
| `status` | MUST | EvidenceStatus のいずれか |
| `type` | MUST（HandoverReport / EVReport） | `"handover"` または `"report"` |
| `report_kind` | MUST（EVReport） | EVReportKind のいずれか |
| `tags` | SHOULD | 手動タグ（`derived_tags` とは別） |
| `depends_on` | SHOULD | 前提文書の ev_id[] |
| `related` | MAY | 関連文書の ev_id[] |
| `supersedes` | MAY | 置換する旧文書の ev_id[] |

### 3.5 frontmatter なしファイルの扱い（v0.4 から変更なし）

`evlite scan` は frontmatter のないファイルも registry に含める。
`ev_id` は `null` として記録し、pack 生成時に path 指定で参照可能にする。

### 3.6 snapshot 生成ファイルの frontmatter（v0.4 から変更なし）

```yaml
---
ev_id: ev:{stack}.snapshot-{stack}-{basename}
stack: {stack}
status: active
tags: [snapshot, code]
depends_on: []
related: []
supersedes: []
---
```

---

## 4. CLI 仕様

### 4.1 コマンド一覧

```
evlite scan                  repo をスキャンして registry.json を生成
evlite pack <pack-id>        pack.json から pack.md を生成
evlite init-meta <file>      frontmatter ブロックを挿入
evlite validate              依存関係・参照の整合性チェック
evlite list                  registry の EvidenceNode 一覧表示
evlite ui                    ローカルサーバー起動 → ブラウザで UI を開く
evlite snapshot <path>       コード/ディレクトリを snapshot .md に変換
evlite handover              HandoverReport のスキャフォールドを生成  ※v0.5 追加
evlite report                EVReport のスキャフォールドを生成        ※v0.5 追加
```

### 4.2 validate オプション

| オプション | 説明 | Status |
|---|---|---|
| `--show-chains` | supersedes チェーンを表示 | ✅ 実装済み |
| `--show-impact <ev_id>` | 指定 node を参照している docs/packs/reports を逆引き | Phase 4 |
| `--show-orphans` | どの pack/node からも参照されていない node を表示 | Phase 4 |
| `--show-depends` | depends_on / related / supersedes の構造を表示 | Phase 4 |
| `--show-cycles` | 循環依存を検出 | Phase 4 |
| `--show-importance` | ImportanceScore と DerivedTag の一覧を表示 | Phase 4 |
| `--strict` | エラー時に exit 1 | ✅ 実装済み |

### 4.3〜4.6 （v0.4 から変更なし）

---

## 5. snapshot .md 生成仕様（v0.4 から変更なし）

---

## 6. Server API 仕様

`@ev-lite/server` は Hono で実装する HTTP adapter。
**business logic は持たない。すべて `@ev-lite/core` に委譲する。**

```
GET  /api/registry              → registry.json を返す
GET  /api/files                 → ファイル一覧（EvidenceNode[]）
GET  /api/file?path=<path>      → frontmatter + 本文を返す
PUT  /api/file?path=<path>      → frontmatter を書き戻す
GET  /api/packs                 → packs/*.json 一覧
GET  /api/packs/:id             → pack.json を返す
PUT  /api/packs/:id             → pack.json を保存
DELETE /api/packs/:id           → pack.json + pack.md を削除
POST /api/packs/:id/build       → pack.md を生成して返す
POST /api/scan                  → evlite scan を実行
POST /api/snapshot              → evlite snapshot を実行
GET  /api/favorites             → favorites 一覧 string[]
POST /api/favorites             → favorites に追加
DELETE /api/favorites/:idx      → favorites から削除
GET  /api/dirs?path=<path>      → サブディレクトリ一覧（Phase 4）
GET  /api/handovers             → HandoverReport 一覧（Phase 4）    ※v0.5 追加
GET  /api/reports               → EVReport 一覧（Phase 4）          ※v0.5 追加
```

---

## 7. UI 仕様

### 7.1 現状（Phase 1-3 実装済み）

```
タブ:
  Metadata Editor  ← ファイル選択 + frontmatter 編集
  Pack Builder     ← pack.json 編集 + pack.md 生成 + Copy
  Snapshot Builder ← path 入力 + Favorites + Generate Snapshot
```

### 7.2 Phase 4 追加予定（v0.5 更新）

- Directory Browser（`GET /api/dirs` ベース）
- Handover タブ（HandoverReport 作成・編集・一覧）
- Report タブ（EVReport 作成・編集・一覧）※旧 "Implementation Report 登録 UI" をこちらで実装
- Metadata Editor への DerivedTag バッジ表示（read-only）

---

## 8. effectiveStatus() 導出（v0.4 から変更なし）

---

## 9. ライブラリ選定（v0.4 から変更なし）

---

## 10. 実装フェーズ

### Phase 0 — Constitution ✅
### Phase 1 — CLI MVP ✅
### Phase 2 — Local Web UI ✅
### Phase 3 — Snapshot ✅

### Phase 4 — AI Collaboration Memory（今ここ）

**Topology Inspection CLI（優先実装順）:**

1. `evlite validate --show-impact <ev_id>`（最優先）
2. `evlite validate --show-orphans`
3. `evlite validate --show-depends`
4. `evlite validate --show-cycles`

**Artifact Type 拡張:**

- `@ev-lite/shared` に `HandoverReport` / `EVReport` / `ImportanceScore` / `DerivedTag` / `RiskSignal` 型を追加
- `EvidenceStatus` に `superseded` / `stale` を追加
- `EvidenceNode` に `derived_tags` / `importance` フィールドを追加
- `evlite scan` での HandoverReport / EVReport 認識と registry 登録
- `evlite handover` / `evlite report` コマンド（スキャフォールド生成）
- `evlite validate` への DerivedTag 表示と RiskSignal 出力
- UI: Handover タブ / Report タブ

**その他:**

- `GET /api/dirs` — サーバー側ディレクトリブラウザ
- Prompt Vault UI（Pack Builder の拡張）
- versioned snapshot（`ev:stack.snapshot-v2 supersedes v1`）
- section index（`kind: "section"`）
- append-only frontmatter history

### Phase 5 — EvidenceVault 統合

- DGC / TraceOS との接続
- CRM reachability extraction
- ObserverAI への RiskSignal 出力パイプライン
- `evlite validate` での仕様変更影響検出

---

## 11. Usecases

### Usecase 1: AI Context Pack（v0.4 から変更なし）
### Usecase 2: Prompt Vault（v0.4 から変更なし）
### Usecase 3: Implementation Report → EVReport（v0.5 更新）

AI の実装レポートを EVReport として registry に登録して指示書と紐づける。

```
Claude Code が実装レポートを出力
    ↓
evlite report  ← スキャフォールド生成（type: report, report_kind: implementation）
    ↓
evlite scan で registry に登録
    ↓
pack.json の related に ev_id を追加
    ↓
前回の実装結果が次の指示の文脈として使える
    ↓
required_packs_for_continuation で次のセッションの mustRead を誘導
```

### Usecase 7: Session Handover ※v0.5 新規追加

セッションをまたいだ作業継続のために認知状態を圧縮して引き継ぐ。

```
セッション終了前に evlite handover でスキャフォールド生成
    ↓
goal / current_state / next_actions / must_read を記述
    ↓
evlite scan で registry に登録
    ↓
新セッション開始時に Handover を pack.md に含めて AI に渡す
    ↓
AI は前セッションの認知状態を構造的に受け取って作業を継続する
```

### Usecase 4〜6（v0.4 から変更なし）

---

## 12. MVP 勝利条件（Phase 4）

```
pack.json を実装指示書として作成
    ↓
pack.md を Claude Code に渡して実装
    ↓
EVReport（report_kind: implementation）を registry に登録
    ↓
pack.json の related に ev_id を追加
    ↓
次の pack.json が report を mustRead として参照できる
    ↓
セッション終了時に HandoverReport を作成・登録
    ↓
次のセッションが HandoverReport を起点として作業を再開できる
```

---

## 13. 明示的な非ゴール（Phase 1-4）（v0.4 から変更なし）

- similarity search / embedding（Graph-RAG ではない）
- リアルタイム同期
- クラウドストレージ
- 認証・マルチユーザー
- Electron / デスクトップアプリ（Phase 5 以降）
- PDF / Notion / Slack の ingestion（Phase 5 以降）

---

## 14. snapshot の非ゴール（v0.4 から変更なし）

```
snapshot is not source of truth.
source files are canonical.
snapshot is an AI transfer artifact.
```

---

_EvidenceVault Lite Constitution v0.5_
_Supersedes: Constitution v0.4_
_Apache 2.0_
_Position: AI Collaboration Memory Infrastructure / DGC Ecosystem Application Layer_
