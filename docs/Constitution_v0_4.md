# EvidenceVault Lite — Constitution v0.4

> **「AIに必要な文脈だけを、構造的に渡す」**

**Status:** Constitution v0.4
**Supersedes:** Constitution v0.3
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

---

## 0.1 ポジションの拡張

Constitution v0.3 まで EvidenceVault Lite は **AI Context Transfer Tool** として設計された。

Constitution v0.4 において、より広いポジションを正式に定義する：

```
AI Collaboration Memory Infrastructure
```

Git が「何が変わったか」を保存するのに対し、EvidenceVault Lite は：

```
なぜその変更をしたか
AI がどう解釈したか
何を読んで実装したか
何を避けたか
```

を保存する。これは Git とは完全に別レイヤーの記録システムである。

### Document → Instruction → Execution → Reflection

```
Document   = 仕様・設計書（ev:stack.spec）
Instruction = AI への実装指示（pack:impl-xxx）
Execution  = AI の実装レポート（ev:stack.report-xxx）
Reflection = 次の Instruction の文脈（depends_on / related）
```

この4つが全て「参照可能な構造化文脈」として統一される。

---

## 1. リポジトリ構成

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

### レイヤー構造

```
evlite-ui（React）
    ↓ fetch
@ev-lite/server（Hono — HTTP adapter のみ）
    ↓
@ev-lite/core（全 business logic）
    ↓
filesystem
```

---

## 2. 中心概念

### 2.1 EvidenceNode

registry の基本単位。Phase 1 では 1ファイル = 1 EvidenceNode。Phase 4 で section index に拡張予定。

```ts
type EvidenceNodeKind = "file" | "section"  // Phase 4 で section index に拡張予定

type EvidenceNode = {
  ev_id:      string | null
  kind:       EvidenceNodeKind
  path:       string
  anchor?:    string
  stack?:     string
  status?:    EvidenceStatus
  tags:       string[]
  depends_on: string[]
  related:    string[]
  supersedes: string[]
  title?:     string
  excerpt?:   string
}
```

### 2.2 EvidenceStatus

```ts
type EvidenceStatus =
  | "active"        // 現行仕様 — Context Pack に含める
  | "draft"         // 草案 — 明示指定時のみ含める
  | "experimental"  // 実験中 — 明示指定時のみ含める
  | "deprecated"    // 非推奨 — 警告を出す
  | "archived"      // 履歴保管 — 含めない
```

### 2.3 ContextPack

AIに渡す目的別コンテキスト束。Prompt Vault においては実装指示書としても機能する。

```ts
type ContextPack = {
  id:          string     // "pack:{name}"
  goal:        string     // このPackで何を達成するか / AI への指示の目的
  mustRead:    string[]   // ev_id[] — 必ず含めるノード
  doNotInfer:  string[]   // AIに推論させてはいけない事項 / 制約
  outputGoal:  string[]   // AIに期待する出力
  status?:     "active" | "draft"
}
```

### 2.4 SnapshotDoc

コードリポジトリ / パッケージを一枚の .md に変換したもの。

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

---

## 3. Frontmatter 仕様

### 3.1 基本形式

```yaml
---
ev_id: ev:{stack}.{name}
stack: {stack}
status: draft | active | experimental | deprecated | archived
tags: []
depends_on: []
related: []
supersedes: []
---
```

### 3.2 フィールド規則

| フィールド | MUST/SHOULD/MAY | 説明 |
|---|---|---|
| `ev_id` | MUST | グローバル一意。`ev:{stack}.{name}` 形式 |
| `stack` | MUST | 所属スタック |
| `status` | MUST | EvidenceStatus のいずれか |
| `tags` | SHOULD | 検索・分類タグ |
| `depends_on` | SHOULD | 前提文書の ev_id[] |
| `related` | MAY | 関連文書の ev_id[] |
| `supersedes` | MAY | 置換する旧文書の ev_id[] |

### 3.3 frontmatter なしファイルの扱い

`evlite scan` は frontmatter のないファイルも registry に含める。
`ev_id` は `null` として記録し、pack 生成時に path 指定で参照可能にする。

### 3.4 snapshot 生成ファイルの frontmatter

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
```

### 4.2〜4.6 （v0.3 から変更なし）

---

## 5. snapshot .md 生成仕様（v0.3 から変更なし）

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

### 7.2 Phase 4 追加予定

- Directory Browser（`GET /api/dirs` ベース）
- Implementation Report 登録 UI

---

## 8. effectiveStatus() 導出（v0.3 から変更なし）

---

## 9. ライブラリ選定（v0.3 から変更なし）

---

## 10. 実装フェーズ

### Phase 0 — Constitution ✅
### Phase 1 — CLI MVP ✅
### Phase 2 — Local Web UI ✅
### Phase 3 — Snapshot ✅

### Phase 4 — AI Collaboration Memory（今ここ）

- `GET /api/dirs` — サーバー側ディレクトリブラウザ
- Prompt Vault UI（Pack Builder の拡張）
- Implementation Report 登録・管理
- versioned snapshot（`ev:stack.snapshot-v2 supersedes v1`）
- section index（`kind: "section"`）
- append-only frontmatter history

### Phase 5 — EvidenceVault 統合

- DGC / TraceOS との接続
- CRM reachability extraction
- `evlite validate` での仕様変更影響検出

---

## 11. Usecases

### Usecase 1: AI Context Pack

仕様書・設計書を構造化して AI に渡す。

```
evlite scan → evlite ui → mustRead を選択 → pack.md → ChatGPT / Claude
```

### Usecase 2: Prompt Vault

AI への実装指示を構造化・蓄積・再利用する。

```
Claude と会話して pack.json を作る
    ↓
evlite pack で pack.md 生成
    ↓
Claude Code / Codex に渡して実装
    ↓
pack.md が .ev-lite/packs/ に蓄積される
    ↓
「いつ・何を・どんな指示で実装したか」が記録として残る
```

pack.json の構造が実装指示書として機能する：

```
goal       = タスクの目的
mustRead   = 実装に必要な仕様・コード
doNotInfer = 制約・やってはいけないこと
outputGoal = 期待する成果物
depends_on = この指示が依存する仕様の ev_id
```

### Usecase 3: Implementation Report

AI の実装レポートを registry に登録して指示書と紐づける。

```
Claude Code が実装レポート report.md を出力
    ↓
evlite init-meta report.md
    ↓
evlite scan で registry に登録
    ↓
pack.json の related に ev_id を追加
    ↓
前回の実装結果が次の指示の文脈として使える
```

```yaml
# pack:impl-active-object-icon
related:
  - ev:flowmemo.report-active-object-icon  ← 実装レポート
depends_on:
  - ev:flowmemo.ui-patterns                ← 依存仕様
```

**Goal ≠ Result を保存できる。** Intent と Outcome が分離して記録される。

### Usecase 4: Cross-repo Consultation

複数 repo をまたいだ AI 相談。

```
dgc-ecosystem-docs/
  dgc_docs/      ← DGC 仕様
  traceos_docs/  ← TraceOS 仕様
  .ev-lite/snapshots/
    dgc-core.md     ← DGC コード snapshot
    traceos-core.md ← TraceOS コード snapshot
```

```
mustRead:
  - ev:dgc.snapshot-decisiongraph-core-src
  - ev:traceos.snapshot-traceos-src
  - ev:dgc.constitution
```

### Usecase 5: Code Snapshot

コードを AI に渡す。

```
evlite snapshot packages/core/src --stack dgc
→ ev:dgc.snapshot-dgc-src が registry に登録
→ pack.md に tree + コードが含まれる
```

### Usecase 6: Dependency-aware Prompt Graph

仕様変更が実装指示に与える影響を検出する。

```
ev:flowmemo.ui-patterns が変更された
    ↓
evlite validate
    ↓
WARN: pack:impl-active-object-icon depends_on ev:flowmemo.ui-patterns
      → この実装指示は仕様変更の影響を受ける可能性があります
```

「この仕様変更で、どの AI 実装指示が腐るか？」を構造的に検出できる。

---

## 12. MVP 勝利条件（Phase 4）

```
pack.json を実装指示書として作成
    ↓
pack.md を Claude Code に渡して実装
    ↓
実装レポート report.md を registry に登録
    ↓
pack.json の related に report を紐づける
    ↓
次の pack.json が report を mustRead として参照できる
```

---

## 13. 明示的な非ゴール（Phase 1-4）

- similarity search / embedding（Graph-RAG ではない）
- リアルタイム同期
- クラウドストレージ
- 認証・マルチユーザー
- Electron / デスクトップアプリ（Phase 5 以降）
- PDF / Notion / Slack の ingestion（Phase 5 以降）

---

## 14. snapshot の非ゴール

```
snapshot is not source of truth.
source files are canonical.
snapshot is an AI transfer artifact.
```

---

_EvidenceVault Lite Constitution v0.4_
_Supersedes: Constitution v0.3_
_Apache 2.0_
_Position: AI Collaboration Memory Infrastructure / DGC Ecosystem Application Layer_
