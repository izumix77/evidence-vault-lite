---
ev_id: 'ev:docs.GETTING_STARTED.ja'
stack: docs
status: active
tags:
  - GETTING_STARTED
  - ja
depends_on: []
related:
  - 'ev:evidence-vault-lite.README'
  - 'ev:docs.GETTING_STARTED'
supersedes: []
---

# EvidenceVault Lite — Getting Started Guide

> AIに必要な文脈だけを、構造的に渡す

---

## 概要

EvidenceVault Lite は、既存の markdown ドキュメントに frontmatter を付けて
**AI に渡す Context Pack（pack.md）を生成するツール**です。

Graph-RAG ではありません。
「何を読ませるか」を人間が定義する **Canonical Context Routing** です。

---

## 前提条件

- Node.js 22+
- pnpm 10+
- Git

---

## Step 1: セットアップ

### リポジトリをクローン・ビルド

```bash
git clone https://github.com/izumix77/evidence-vault-lite
cd evidence-vault-lite
pnpm install
pnpm build
```

### コマンドを使えるようにする（Windows PowerShell）

グローバルインストールは `workspace:*` 依存の制約で動作しないため、
PowerShell Profile に function を追加します。

```powershell
# Profile を開く
notepad $PROFILE
```

以下を追記して保存：

```powershell
function evlite { node "C:\path\to\evidence-vault-lite\packages\cli\dist\index.js" @args }
```

Profile を再読み込み：

```powershell
. $PROFILE
evlite --version   # 0.1.0 が表示されれば OK
```

### コマンドを使えるようにする（macOS / Linux）

```bash
# ~/.bashrc または ~/.zshrc に追記
alias evlite="node /path/to/evidence-vault-lite/packages/cli/dist/index.js"
```

---

## Step 2: 既存 repo に導入する

対象 repo に移動して scan します。

```bash
cd /path/to/your-repo
evlite scan
```

出力例：
```
✔ Scanned 83 files
✔ 2 frontmatter blocks found
✔ registry.json generated → .ev-lite/registry.json
```

`.ev-lite/registry.json` に全 markdown ファイルのインデックスが生成されます。

---

## Step 3: UI を起動する

```bash
evlite ui --root /path/to/your-repo
```

出力例：
```
✔ EvidenceVault Lite UI
✔ Serving: http://localhost:3137
✔ Root: /path/to/your-repo
```

ブラウザで `http://localhost:3137` が自動で開きます。

> ポートが使用中の場合：
> ```powershell
> # Windows
> Get-NetTCPConnection -LocalPort 3137 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
> ```

---

## Step 4: 全ファイルに frontmatter を一括挿入する

UI を開くと大量のファイルが `No Metadata` セクションに並びます。
`evlite init-meta` で一括挿入できます。

```bash
# Linux / macOS
find . -name "*.md" | xargs -I{} evlite init-meta {}

# Windows PowerShell
Get-ChildItem -Recurse -Filter "*.md" | ForEach-Object {
    evlite init-meta $_.FullName
}
```

出力例：
```
✔ frontmatter inserted → docs/README.md
✔ frontmatter inserted → docs/architecture.md
WARN: frontmatter already exists in docs/GLOSSARY.md — skipped
```

挿入される frontmatter：

```yaml
---
ev_id: ev:docs.README        ← ファイル名から自動推定
stack: docs                  ← ディレクトリ名から推定
status: draft
tags: []
depends_on: []
related: []
supersedes: []
---
```

その後 `evlite scan` で registry を更新：

```bash
evlite scan
```

UI をリロードすると全ファイルが `With Metadata` に移動します。

---

## Step 5: UI で frontmatter を編集する

### ファイル一覧

左ペインにファイルが **stack / ディレクトリ別にグループ化**されて表示されます。

```
▼ WITH METADATA (83)
  ▼ dgc (12)
      ev:dgc.constitution — Constitution.md
      ev:dgc.types — types.md
  ▼ traceos (8)
      ev:traceos.constitution — CONSTITUTION.md
▼ NO METADATA (0)
```

グループ名・セクション名をクリックで折りたたみ/展開できます。

### Metadata Editor

ファイルをクリックすると右ペインに Metadata Editor が表示されます。

| フィールド | 意味 | 例 |
|---|---|---|
| `ev_id` | グローバル一意 ID | `ev:dgc.constitution` |
| `stack` | 所属スタック | `dgc` |
| `status` | 有効状態 | `active` |
| `tags` | 検索・分類タグ | `core, spec` |
| `depends_on` | 前提となる文書 | `ev:dgc.constitution` |
| `related` | 関連文書 | `ev:dgc.types` |
| `supersedes` | 旧バージョンの置換 | `ev:dgc.constitution-v0-1` |

**フィールドの使い分け：**

```
depends_on = これを読まないと理解できない（前提）
related    = 関連している（参考）
supersedes = 旧バージョンを置き換える
```

`depends_on` / `related` / `supersedes` の入力欄では
`ev:` と打つと registry 内の ev_id が候補として表示されます。

**[ Save Metadata ]** をクリックすると .md ファイルの frontmatter が更新されます。

### 重要なファイルは status を active に

```yaml
status: active   ← Context Pack に含める（重要文書）
status: draft    ← 草案（明示指定時のみ含める）
status: archived ← 履歴保管（含めない）
```

---

## Step 6: コードを snapshot する

仕様書だけでなく、**コードそのものも AI に渡せます**。

```bash
evlite snapshot packages/core/src --stack dgc
```

出力例：
```
✔ Scanned 9 files
✔ snapshot.md generated → .ev-lite/snapshots/src.md
✔ ev_id: ev:dgc.snapshot-src
```

生成される snapshot.md の構造：

```md
# Directory: packages/core/src

## Tree
packages/core/src/
  index.ts
  apply.ts
  types.ts
  ...

---

## index.ts
\`\`\`ts
// ファイル内容
\`\`\`

## apply.ts
\`\`\`ts
// ファイル内容
\`\`\`
```

**UI から snapshot を生成することもできます：**
Snapshot タブ → path を入力 → [ Generate Snapshot ]

> snapshot は転送用アーティファクトです。
> `source files are canonical. snapshot is an AI transfer artifact.`

snapshot 生成後は `evlite scan` で registry に登録します：

```bash
evlite scan
```

### 依存追跡モード：import グラフで snapshot する

エントリーポイントから実際に到達できるファイルだけを snapshot するには `--deps` を使います：

```bash
evlite snapshot packages/core/src/index.ts --deps --stack dgc
```

出力例：
```
✔ Resolved 12 files (17 edges)
✔ Skipped 31 imports
✔ snapshot.md generated → .ev-lite/snapshots/index.md
✔ ev_id: ev:dgc.snapshot-index
```

生成される snapshot.md には以下の3セクションが追加されます：

- **Dependency Scope** — サマリーテーブル（ファイル数・エッジ数・スキップ数）
- **Dependency Tree** — import グラフのビジュアルツリー（共有依存は `(visited)` でマーク）
- **Skipped Imports** — 追跡しなかった import の一覧と理由（`external` / `alias` / `missing` など）

このモードは**静的な相対 import**（`./` と `../`）のみを追跡します。
`node_modules` やワークスペースエイリアス（例: `@ev-lite/shared`）はスキップとして記録されます（サイレントに無視されません）。

> **`--deps` とディレクトリ snapshot の使い分け：**
> - ディレクトリ snapshot：フォルダ内のファイルをまとめて渡したい
> - `--deps`：エントリーポイントが実際に使っているファイルだけを渡したい

### Agent コンテキストのコンパイル

dependency snapshot と pack を1コマンドで生成するには：

```bash
evlite context packages/core/src/index.ts --goal "implement --output option" --stack evlite
```

出力例：
```
✔ snapshot.md generated  → .ev-lite/snapshots/index.md
✔ ev_id                  → ev:evlite.snapshot-index
✔ pack.json saved        → .ev-lite/packs/context-index-20260527T103000.json
✔ pack.md generated      → .ev-lite/packs/context-index-20260527T103000.md
✔ pack_id                → pack:context-index-20260527T103000
```

ファイルを書かずに内容を確認するには：

```bash
evlite context packages/core/src/index.ts --goal "..." --dry-run
```

ファイル変更による影響範囲を調べるには：

```bash
evlite validate --affected packages/core/src/snapshot.ts
```

---

## Step 7: Context Pack を作る

### pack.json を作成する

UI の **Pack Builder タブ** を開きます。

| フィールド | 意味 |
|---|---|
| `id` | pack の識別子（`pack:my-pack`、作成後は変更不可） |
| `goal` | AI に何をしてほしいか |
| `mustRead` | AI に必ず読ませる文書の ev_id リスト |
| `doNotInfer` | AI に推論させてはいけないこと |
| `outputGoal` | AI に期待する出力 |

例：

```json
{
  "id": "pack:glassbox-overview",
  "goal": "Understand GlassBox architecture and design principles",
  "mustRead": [
    "ev:glassbox.readme",
    "ev:glassbox.readme-ja",
    "ev:glassbox.todo"
  ],
  "doNotInfer": [
    "Do not assume implementation details not in the docs"
  ],
  "outputGoal": [
    "Explain GlassBox's core concepts",
    "Identify dependencies on DGC/TraceOS"
  ]
}
```

**[ Save Pack ]** で `.ev-lite/packs/glassbox-overview.json` に保存されます。

### pack.md を生成する

**[ Generate pack.md ]** をクリックするとプレビューが表示されます。
右上の **[ Copy ]** ボタンでクリップボードにコピーできます。

CLI からも生成できます：

```bash
evlite pack glassbox-overview
# → .ev-lite/packs/glassbox-overview.md
```

---

## Step 8: pack.md を AI に渡す

生成した pack.md を ChatGPT / Claude Project に貼り付けるだけです。

```
# Context Pack — Understand GlassBox architecture and design principles

> Generated by EvidenceVault Lite 0.1.0
> Pack ID: pack:glassbox-overview

## Scope
Understand GlassBox architecture and design principles

## Output Goal
- Explain GlassBox's core concepts

## Do Not Infer
- Do not assume implementation details not in the docs

---

## Context

### GlassBox README
...（ファイル内容）
```

AI は `goal` / `outputGoal` / `doNotInfer` を指示として読み、
`mustRead` のコンテンツを文脈として理解します。

---

## CLI リファレンス

| コマンド | 説明 |
|---|---|
| `evlite scan` | repo をスキャン → `registry.json` 生成 |
| `evlite snapshot <path>` | コードを snapshot → `snapshot.md` 生成 |
| `evlite pack <pack-id>` | `pack.json` から `pack.md` 生成 |
| `evlite init-meta <file>` | frontmatter ブロックを挿入 |
| `evlite validate` | 依存関係・参照の整合性チェック |
| `evlite context <entrypoint>` | Agent コンテキストをコンパイル: deps snapshot + pack を1コマンドで生成 |
| `evlite report <name>` | EVReport のスキャフォールドを生成 |
| `evlite ui` | ローカル UI 起動 → `localhost:3137` |

### snapshot オプション

| オプション | 説明 |
|---|---|
| `--stack <stack>` | frontmatter の stack 値 |
| `--output <path>` | 出力ファイルパス |
| `--include <glob>` | 対象ファイルパターン（複数指定可） |
| `--exclude <glob>` | 除外パターン（複数指定可） |
| `--no-content` | tree のみ（コード内容を含めない） |
| `--deps` | エントリーポイントから import/export 依存を追跡 |
| `--max-depth <n>` | 最大追跡深度（デフォルト: `10`） |
| `--include-tests` | `.spec.ts` / `.test.ts` を追跡対象に含める |
| `--no-dep-tree` | Dependency Tree セクションを省略 |
| `--dry-run` | snapshot.md を書かずに依存グラフを解決して表示 |
| `--json` | DepGraph を JSON で stdout に出力（machine-readable contract） |

### validate オプション

| オプション | 説明 |
|---|---|
| `--strict` | ERROR があれば exit 1 |
| `--show-chains` | supersedes チェーンを表示 |
| `--show-impact <ev_id>` | 指定 ev_id を参照している docs/packs を逆引き |
| `--show-orphans` | どの doc/pack からも参照されていない node を一覧 |
| `--show-depends` | depends_on / related / supersedes の構造を表示 |
| `--show-cycles` | 循環依存を検出 |
| `--active-only` | `--show-depends` と併用: superseded な related をスキップ |
| `--focus <ev_id>` | 指定 ev_id の全情報を一括表示 |
| `--focus-dir <path>` | 指定フォルダ内の全 node 情報を一括表示 |
| `--output <path>` | validate の出力をファイルに保存 |
| `--affected <file>` | source file の変更で影響を受ける snapshot / pack を逆引き |
| `--json` | `--affected` の結果を JSON で出力（`--affected` と併用） |

### report オプション

| オプション | 説明 |
|---|---|
| `--kind <kind>` | レポート種別: `implementation` / `analysis` / `architecture` / `research` / `incident` / `observer` / `retrospective`（デフォルト: `implementation`） |
| `--stack <stack>` | frontmatter の stack 値（デフォルト: `docs`） |
| `--output <path>` | 出力ファイルパス（デフォルト: `artifacts/reports/<name>.report.md`） |

### ui オプション

| オプション | 説明 |
|---|---|
| `--root <path>` | 対象ディレクトリ |
| `--port <port>` | ポート番号（デフォルト: `3137`） |

> repo ごとにデフォルトポートを設定する場合は `.ev-lite/settings.json` を作成：
> ```json
> { "port": 3138, "description": "my-repo — 参照用 UI" }
> ```

---

## よくあるパターン

### 複数 repo をまたいで相談したい

専用ドキュメント repo を作成して各 repo の docs を集めます：

```
dgc-ecosystem-docs/
  dgc_docs/
  traceos_docs/
  burnscope_docs/
  ...
```

```bash
cd dgc-ecosystem-docs
evlite scan
evlite ui
```

### 依存関係を整合性チェックしたい

```bash
evlite validate
```

```
WARN: ev:burnscope.mvp depends_on missing → ev:traceid.phase1
ERROR: duplicate ev_id → ev:traceid.phase1 (2 files)
```

### .gitignore の推奨設定

```
# .ev-lite/ はすべて除外（個人の環境情報が含まれるため）
.ev-lite/
```

---

## Philosophy

```
EvidenceVault Lite does not search for relevance.
EvidenceVault Lite routes context by human-defined structure.

Not Graph-RAG. Canonical Context Routing.

Truth about what to read emerges outside the system.
```

---

_EvidenceVault Lite Getting Started Guide_
_Apache 2.0_
