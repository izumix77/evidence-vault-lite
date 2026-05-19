# EvidenceVault Lite — Constitution v0.3

> **「AIに必要な文脈だけを、構造的に渡す」**

**Status:** Constitution v0.3
**Supersedes:** Constitution v0.2
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
- **snapshot = code transfer artifact** — snapshot は転送用。source files が正本。コードも構造化されたコンテキストとして AI に渡せる

---

## 1. リポジトリ構成

```
evidence-vault-lite/
  apps/
    evlite-ui/          ← Vite + React（Phase 2 — Metadata Editor / Pack Builder）
  packages/
    shared/             ← 共有型定義・zod スキーマ
    core/               ← 純ロジック（scan / parse / registry / pack / snapshot）
    server/             ← HTTP adapter（Hono）
    cli/                ← terminal UX（commander）
  docs/
  package.json          ← pnpm workspace root
```

### パッケージ責務

| パッケージ | 責務 | 外部依存 |
|---|---|---|
| `@ev-lite/shared` | 型定義・zod スキーマ | zod のみ |
| `@ev-lite/core` | scan / parse / registry / pack / snapshot 生成 | gray-matter, remark, fast-glob, fs-extra |
| `@ev-lite/server` | HTTP adapter（Hono）| hono, @ev-lite/core |
| `@ev-lite/cli` | CLI UX + `evlite ui` / `evlite snapshot` | commander, picocolors, @ev-lite/core, @ev-lite/server |
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

### 2.4 SnapshotDoc（Phase 3 追加）

コードリポジトリ / パッケージを一枚の .md に変換したもの。
`evlite snapshot` で生成し、registry に EvidenceNode として登録される。

```ts
type SnapshotDoc = {
  title:      string    // "Package: @scope/name" または "Directory: path/to/dir"
  sourcePath: string    // スキャン対象のパス（repo-relative）
  generatedAt: string   // ISO8601
  tree:       string    // ディレクトリツリー文字列
  files:      SnapshotFile[]
}

type SnapshotFile = {
  path:     string    // repo-relative
  language: string    // "ts" | "tsx" | "js" | "json" | "yaml" | ...
  content:  string    // ファイル内容
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

### 3.4 snapshot 生成ファイルの frontmatter

`evlite snapshot` が生成する .md には自動で frontmatter を挿入する。

```yaml
---
ev_id: ev:{stack}.snapshot-{basename}
stack: {stack}        # --stack オプションで指定、省略時はディレクトリ名
status: active
tags: [snapshot, code]
depends_on: []
related: []
supersedes: []        # 再生成時に前回の ev_id を自動設定
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
evlite snapshot <path>       コード/ディレクトリを snapshot .md に変換  ← Phase 3 追加
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

### 4.4 evlite init-meta

```bash
evlite init-meta <file>
```

### 4.5 evlite validate

```bash
evlite validate [--strict]
```

### 4.6 evlite ui

```bash
evlite ui [--root <path>] [--port <port>]
```

- デフォルト port: `3137`

### 4.7 evlite snapshot（Phase 3）

```bash
evlite snapshot <path> [options]

Options:
  --output <path>       出力ファイルパス（省略時: .ev-lite/snapshots/{basename}.md）
  --stack <stack>       frontmatter の stack 値（省略時: ディレクトリ名から推定）
  --include <glob>      対象ファイルのパターン（複数指定可、デフォルト: **/*.ts,**/*.tsx,**/*.js,**/*.jsx）
  --exclude <glob>      除外パターン（複数指定可）
  --no-content          tree のみ出力（コード内容を含めない）
  --title <title>       snapshot のタイトル（省略時: "Package: {name}" or "Directory: {path}"）
```

**デフォルト include パターン:**
```
**/*.ts
**/*.tsx
**/*.js
**/*.jsx
**/*.json
**/*.yaml
**/*.yml
```

**デフォルト exclude パターン:**
```
node_modules/
dist/
.git/
*.test.ts
*.spec.ts
*.d.ts
```

**出力例:**
```
✔ Scanned 12 files
✔ snapshot.md generated → .ev-lite/snapshots/core.md
✔ ev_id: ev:dgc.snapshot-core
```

---

## 5. snapshot .md 生成仕様

### 5.1 構造

````md
---
ev_id: ev:{stack}.snapshot-{basename}
stack: {stack}
status: active
tags: [snapshot, code]
depends_on: []
related: []
supersedes: []
---

# {title}

> Generated by EvidenceVault Lite {version}
> Source: {sourcePath}
> Generated at: {timestamp}

## Tree

```
{ディレクトリツリー}
```

---

## {relative/path/to/file.ts}

```{language}
{ファイル内容}
```

---

## {relative/path/to/another.ts}

```{language}
{ファイル内容}
```

---
````

### 5.2 tree 生成規則

- スキャン対象ファイルのみ tree に含める（exclude されたファイルは表示しない）
- インデントはスペース 2 つ
- ディレクトリは `/` で終わる

### 5.3 再生成時の上書き処理（Phase 3）

同じ output パスに既存ファイルが存在する場合：
- **同じ `ev_id` で上書き更新する**
- `supersedes` の自動設定は行わない（Phase 4 で versioned snapshot を導入予定）
- snapshot は転送用アーティファクトなので、常に最新版が有効

```
Phase 3: ev:ev-lite.snapshot-core（上書き更新）
Phase 4: ev:ev-lite.snapshot-core.v2 supersedes ev:ev-lite.snapshot-core.v1
```

### 5.4 snapshot の非ゴール

```
snapshot is not source of truth.
source files are canonical.
snapshot is an AI transfer artifact.
```

- snapshot を編集してはいけない（再生成で上書きされる）
- snapshot の内容と source が乖離した場合は source が正しい
- snapshot は `evlite scan` 後に `pack.md` の `mustRead` から参照する用途のみ

---

## 6. Server API 仕様

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
DELETE /api/packs/:id           → pack.json + pack.md を削除
POST /api/packs/:id/build       → pack.md を生成して返す
POST /api/scan                  → evlite scan を実行
POST /api/snapshot              → evlite snapshot を実行（Phase 3）
```

---

## 7. UI 仕様

### 7.1 画面構成（Phase 2 現状）

```
┌─────────────────────────────────────────┐
│  EvidenceVault Lite          [Scan ▶]   │
├──────────────┬──────────────────────────┤
│ File List    │  [Metadata Editor][Pack Builder] │
│              │                          │
│ With Meta(N) │  Metadata Editor:        │
│  ● ev:...    │    ev_id / stack /       │
│              │    status / tags /       │
│ No Meta(N)   │    depends_on /          │
│  ● README    │    related / supersedes  │
│              │    (EvIdInput datalist)  │
│              │  [ Save Metadata ]       │
│              ├──────────────────────────┤
│              │  Pack Builder:           │
│              │    id / goal /           │
│              │    mustRead(EvIdList) /  │
│              │    doNotInfer /          │
│              │    outputGoal            │
│              │  [Save][Generate][Copy]  │
│              │  Preview: pack.md        │
└──────────────┴──────────────────────────┘
```

### 7.2 Phase 3 追加予定

- Snapshot Builder タブ（path 指定 → snapshot 生成）
- snapshot .md の registry への自動登録

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

### Phase 2 — Local Web UI ✅
- `@ev-lite/server`: Hono HTTP adapter
- `evlite-ui`: Vite + React（Metadata Editor + Pack Builder）
- `@ev-lite/cli`: `evlite ui` コマンド
- EvIdInput datalist autocomplete
- Pack 削除 / id immutable 設計
- pack.md Copy ボタン

### Phase 3 — Snapshot（今ここ）
- `evlite snapshot` コマンド実装
- `@ev-lite/core`: snapshot 生成ロジック
- snapshot .md の frontmatter 自動挿入
- 再生成時の `supersedes` 自動設定
- UI: Snapshot Builder タブ（Phase 3+）

### Phase 4 — EvidenceVault 統合
- DGC / TraceOS との接続
- section index（`kind: "section"`）
- append-only frontmatter history
- CRM reachability extraction
- `GET /api/dirs` — サーバー側ディレクトリブラウザ API
  - Snapshot Builder でフォルダを絶対パスで選択できるようにする
  - `GET /api/dirs?path=F:\OSS_project` → サブディレクトリ一覧を返す
  - ブラウザの File System Access API の制約（絶対パス取得不可）を回避
  - versioned snapshot（`ev:stack.snapshot-v2 supersedes v1`）

---

## 11. MVP 勝利条件（Phase 3）

```
evlite snapshot packages/core/src --stack ev-lite
    ↓
.ev-lite/snapshots/src.md が生成される
    ↓
# Package: @ev-lite/core
## Tree
## src/scan.ts
\`\`\`ts
...
\`\`\`
    ↓
evlite scan → registry に登録
    ↓
pack の mustRead に ev:ev-lite.snapshot-src を追加
    ↓
pack.md に tree + コードが含まれる
```

---

## 12. 明示的な非ゴール（Phase 1-3）

- similarity search / embedding（Graph-RAG ではない）
- リアルタイム同期
- クラウドストレージ
- 認証・マルチユーザー
- Electron / デスクトップアプリ（Phase 4 以降）
- PDF / Notion / Slack の ingestion（Phase 4 以降）

---

_EvidenceVault Lite Constitution v0.3_
_Supersedes: Constitution v0.2_
_Apache 2.0_
_Position: Document Context Routing System / DGC Ecosystem Application Layer_
