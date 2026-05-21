---
ev_id: 'ev:docs.constitution-v0-2'
stack: docs
status: active
tags:
  - constitution
  - core
  - phase2
depends_on: []
related: []
supersedes:
  - 'ev:docs.constitution'
---
# EvidenceVault Lite — Constitution v0.2

> **「AIに必要な文脈だけを、構造的に渡す」**

**Status:** Constitution v0.2
**Supersedes:** Constitution v0.1
**License:** Apache 2.0
**Position:** Document Context Routing System — DGC Ecosystem Application Layer
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
- **metadata preservation** — frontmatter は破壊的に消さない。append-only history は Phase 3 以降
- **kernel neutrality** — core はスキャン・パース・グラフ構築のみ。意味の判断は外部
- **server = HTTP adapter** — business logic は core に置く。server は薄い変換層に徹する

---

## 1. リポジトリ構成

```
evidence-vault-lite/
  apps/
    evlite-ui/          ← Vite + React（Phase 2 — Metadata Editor / Pack Builder）
  packages/
    shared/             ← 共有型定義・zod スキーマ
    core/               ← 純ロジック（scan / parse / registry / pack）
    server/             ← HTTP adapter（Hono）← Phase 2 追加
    cli/                ← terminal UX（commander）
  docs/
  package.json          ← pnpm workspace root
```

### パッケージ責務

| パッケージ | 責務 | 外部依存 |
|---|---|---|
| `@ev-lite/shared` | 型定義・zod スキーマ | zod のみ |
| `@ev-lite/core` | scan / parse / registry / pack 生成 | gray-matter, remark, fast-glob, fs-extra |
| `@ev-lite/server` | HTTP adapter（Hono）| hono, @ev-lite/core |
| `@ev-lite/cli` | CLI UX + `evlite ui` コマンド | commander, picocolors, @ev-lite/core, @ev-lite/server |
| `evlite-ui` | Metadata Editor + Pack Builder | React, Vite |

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

registry の基本単位。Phase 1 では 1ファイル = 1 EvidenceNode。Phase 3 で section index に拡張予定。

```ts
type EvidenceNodeKind = "file" | "section"  // Phase 3 で section index に拡張予定

type EvidenceNode = {
  ev_id:      string | null   // "ev:{stack}.{name}" — frontmatter なし時は null
  kind:       EvidenceNodeKind
  path:       string          // repo-relative path
  anchor?:    string          // section index 用（Phase 3）
  stack?:     string          // 所属スタック（frontmatter なし時は undefined）
  status?:    EvidenceStatus  // frontmatter なし時は undefined
  tags:       string[]
  depends_on: string[]        // ev_id[] — 前提となる文書
  related:    string[]        // ev_id[] — 関連文書
  supersedes: string[]        // ev_id[] — 旧仕様の置換
  title?:     string          // frontmatter または H1 から抽出
  excerpt?:   string          // 先頭 N 文字
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

Context Pack 生成時のデフォルト: `active` のみ。

### 2.3 ContextPack

AIに渡す目的別コンテキスト束。

```ts
type ContextPack = {
  id:          string     // "pack:{name}"
  goal:        string     // このPackで何を達成するか
  mustRead:    string[]   // ev_id[] — 必ず含めるノード
  doNotInfer:  string[]   // AIに推論させてはいけない事項
  outputGoal:  string[]   // AIに期待する出力
  status?:     "active" | "draft"
}
```

### 2.4 registry.json

repo scan の出力。全 EvidenceNode のインデックス。

```json
{
  "generated_at": "2026-05-17T...",
  "root": "./",
  "nodes": [
    {
      "ev_id": "ev:burnscope.mvp",
      "path": "docs/BurnScope_MVP.md",
      "stack": "burnscope",
      "status": "active",
      "tags": ["mvp", "instrumentation"],
      "depends_on": ["ev:traceid.phase1"],
      "related": ["ev:flowmemo-eval.llm-adapter"],
      "supersedes": []
    }
  ]
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
| `stack` | MUST | 所属スタック（burnscope / traceid / flowmemo 等） |
| `status` | MUST | EvidenceStatus のいずれか |
| `tags` | SHOULD | 検索・分類タグ |
| `depends_on` | SHOULD | 前提文書の ev_id[] |
| `related` | MAY | 関連文書の ev_id[] |
| `supersedes` | MAY | 置換する旧文書の ev_id[] |

### 3.3 frontmatter なしファイルの扱い

`evlite scan` は frontmatter のないファイルも registry に含める。
ただし `ev_id` は `null` として記録し、pack 生成時に path 指定で参照可能にする。

---

## 4. CLI 仕様

### 4.1 コマンド一覧

```
evlite scan              repo をスキャンして registry.json を生成
evlite pack <pack-id>    pack.json から pack.md を生成
evlite init-meta <file>  frontmatter ブロックを挿入
evlite validate          依存関係・参照の整合性チェック
evlite list              registry の EvidenceNode 一覧表示
evlite ui                ローカルサーバー起動 → ブラウザで UI を開く  ← Phase 2 追加
```

### 4.2 evlite scan

```bash
evlite scan [--root <path>] [--output <path>]
```

- デフォルト root: カレントディレクトリ
- デフォルト output: `.ev-lite/registry.json`
- スキャン対象: `**/*.md`
- 除外デフォルト: `node_modules/`, `dist/`, `.git/`, `.ev-lite/`

### 4.3 evlite pack

```bash
evlite pack <pack-id> [--config <path>] [--output <path>]
```

- pack 定義: `.ev-lite/packs/<pack-id>.json`
- デフォルト output: `.ev-lite/packs/<pack-id>.md`
- `mustRead` の ev_id を解決 → ファイル内容を結合
- `status: active` 以外が混入する場合は警告

### 4.4 evlite init-meta

```bash
evlite init-meta <file>
```

- 対象ファイルに frontmatter ブロックを挿入（既存の場合はスキップ）
- `ev_id` はファイル名から自動推定（編集前提）

### 4.5 evlite validate

```bash
evlite validate [--strict]
```

チェック項目:
- `depends_on` に存在しない ev_id を参照していないか
- `supersedes` に存在しない ev_id を参照していないか
- `deprecated` / `archived` 文書を `active` pack が参照していないか
- `ev_id` の重複
- `status: active` の文書が `deprecated` に依存していないか

### 4.6 evlite ui（Phase 2）

```bash
evlite ui [--root <path>] [--port <port>]
```

- デフォルト port: `3137`
- `@ev-lite/server` を起動
- ブラウザを自動オープン（`open` / `start` コマンド）
- 起動メッセージ:
  ```
  ✔ EvidenceVault Lite UI
  ✔ Serving: localhost:3137
  ✔ Root: F:\OSS_project\my-repo
  ```

---

## 5. pack.md 生成仕様

### 5.1 構造

```md
# Context Pack — {goal}

> Generated by EvidenceVault Lite {version}
> Pack ID: {id}
> Generated at: {timestamp}

## Scope

{goal}

## Output Goal

{outputGoal の箇条書き}

## Do Not Infer

{doNotInfer の箇条書き}

---

## Context

### {title} (`{path}`)

{ファイルの本文（frontmatter 除去済み）}

---
```

### 5.2 frontmatter 処理

pack.md に含めるファイルコンテンツは frontmatter を除去した本文のみ。
frontmatter のメタ情報は pack.json に保持する。

---

## 6. Server API 仕様（Phase 2）

`@ev-lite/server` は Hono で実装する HTTP adapter。
**business logic は持たない。すべて `@ev-lite/core` に委譲する。**

### エンドポイント

```
GET  /api/registry              → registry.json を返す
GET  /api/files                 → ファイル一覧（EvidenceNode[]）
GET  /api/file?path=<path>      → frontmatter + 本文を返す
PUT  /api/file?path=<path>      → frontmatter を書き戻す
GET  /api/packs                 → packs/*.json 一覧
GET  /api/packs/:id             → pack.json を返す
PUT  /api/packs/:id             → pack.json を保存
POST /api/packs/:id/build       → pack.md を生成して返す
POST /api/scan                  → evlite scan を実行
```

### CORS

localhost 開発のため全オリジン許可（production 想定なし）。

---

## 7. UI 仕様（Phase 2）

### 7.1 画面構成

```
┌─────────────────────────────────────────┐
│  EvidenceVault Lite          [Scan ▶]   │
├──────────────┬──────────────────────────┤
│ File List    │  Metadata Editor         │
│              │                          │
│ ● README.md  │  ev_id    [ ... ]        │
│ ● docs/      │  stack    [ ... ]        │
│   Const...   │  status   [ active ▼]    │
│ ● ...        │  tags     [chip][chip]   │
│              │  depends_on  [node]      │
│              │  related     [node]      │
│              │  supersedes  [node]      │
│              │                          │
│              │  [ Save Metadata ]       │
├──────────────┴──────────────────────────┤
│  Pack Builder                           │
│  pack-id  [ burnscope-mvp ]             │
│  goal     [ ... ]                       │
│  mustRead [ ev:burnscope.mvp ] [+]      │
│                                         │
│  [ Save Pack ]   [ Generate pack.md ]   │
│                                         │
│  Preview: pack.md ↓                     │
│  ┌─────────────────────────────────┐   │
│  │ # Context Pack — ...            │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 7.2 操作フロー

**Metadata Editor:**
```
ファイル一覧クリック
    ↓
GET /api/file?path=... → frontmatter 表示
    ↓
GUI で編集
    ↓
[ Save Metadata ] → PUT /api/file?path=...
    ↓
.md ファイルに frontmatter 書き戻し
```

**Pack Builder:**
```
pack 選択 or 新規作成
    ↓
GET /api/packs/:id → フォーム表示
    ↓
mustRead に ev_id を追加（registry から選択）
    ↓
[ Save Pack ] → PUT /api/packs/:id
[ Generate pack.md ] → POST /api/packs/:id/build
    ↓
pack.md プレビュー表示
```

---

## 8. effectiveStatus() 導出

DGC topology 思想との整合。

```
ファイルA が supersedes: [ファイルB] を持つ場合：
  ファイルB の effectiveStatus = "superseded"（フィールドに書かなくても構造から導出）
```

`evlite validate` および `evlite pack` は topology から effectiveStatus を導出し、
フィールドの `status` と矛盾する場合に警告を出す。

---

## 9. ライブラリ選定

| 用途 | ライブラリ | 理由 |
|---|---|---|
| frontmatter parse | `gray-matter` | デファクトスタンダード |
| markdown parse | `remark` | AST ベース、拡張性高い |
| file scan | `fast-glob` | 高速、パターン豊富 |
| schema validation | `zod` | TS 型と一体化 |
| HTTP server | `hono` | 軽量・型安全・Node 以外にも移植可能 |
| CLI framework | `commander` | 成熟・シンプル |
| terminal color | `picocolors` | 軽量 |
| file utils | `fs-extra` | fs の上位互換 |
| dev runtime | `tsx` | ts-node 代替 |
| UI framework | `React + Vite` | Phase 2 |

---

## 10. 実装フェーズ

### Phase 0 — Constitution ✅
- Constitution v0.1 確定

### Phase 1 — CLI MVP ✅
- `@ev-lite/shared`: zod スキーマ・型定義
- `@ev-lite/core`: scan / parse / registry / pack
- `@ev-lite/cli`: scan / pack / init-meta / validate

### Phase 2 — Local Web UI（今ここ）
- `@ev-lite/server`: Hono HTTP adapter
- `evlite-ui`: Vite + React（Metadata Editor + Pack Builder）
- `@ev-lite/cli`: `evlite ui` コマンド追加

### Phase 3 — EvidenceVault 統合
- DGC / TraceOS との接続
- section index（`kind: "section"`）
- append-only frontmatter history
- CRM reachability extraction

---

## 11. MVP 勝利条件（Phase 2）

```
evlite ui
    ↓
localhost:3137 が開く
    ↓
ファイル一覧が表示される
    ↓
frontmatter を GUI で編集して Save できる
    ↓
Pack Builder で pack.md を生成してプレビューできる
```

---

## 12. 明示的な非ゴール（Phase 1-2）

- similarity search / embedding（Graph-RAG ではない）
- リアルタイム同期
- クラウドストレージ
- 認証・マルチユーザー
- Electron / デスクトップアプリ（Phase 3 以降）
- PDF / Notion / Slack の ingestion（Phase 3 以降）

---

_EvidenceVault Lite Constitution v0.2_
_Supersedes: Constitution v0.1_
_Apache 2.0_
_Position: Document Context Routing System / DGC Ecosystem Application Layer_
