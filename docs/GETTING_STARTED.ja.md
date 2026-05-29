---
ev_id: 'ev:docs.GETTING_STARTED.ja'
stack: docs
status: active
tags:
  - GETTING_STARTED
depends_on: []
related:
  - 'ev:evidence-vault-lite.README'
  - 'ev:docs.GETTING_STARTED'
supersedes: []
---

# EVLite はじめに

> Deliver only the context AI needs — through human-defined structure.

このガイドは現時点（Phase 4 完了）の EVLite が備えている全機能を順に追います：scan、UI の 6 タブ、snapshot、Context Pack、Report、Handover、validate スイート。最後に実際の AI ネイティブ開発ループを 1 例として示します。

前提: Node.js 22+ / pnpm 10+ / Git。

---

## 1. インストールと最初の scan

ソースからビルドします（`npm publish` 未対応のため）。`evlite` コマンドはシムを作成して利用します。

```powershell
git clone https://github.com/izumix77/evidence-vault-lite
cd evidence-vault-lite
pnpm install
pnpm build
```

**Windows / PowerShell** — プロファイルに関数を追加:

```powershell
notepad $PROFILE
# 以下を追記（パスは置き換えてください）:
function evlite { node "C:\path\to\evidence-vault-lite\packages\cli\dist\index.js" @args }
. $PROFILE
evlite --version   # → 0.1.0
```

**macOS / Linux:**

```bash
alias evlite='node /path/to/evidence-vault-lite/packages/cli/dist/index.js'
```

リポジトリを index して UI を開きます:

```powershell
cd your-repo
evlite scan
# ✔ Scanned 83 files
# ✔ 2 frontmatter blocks found
# ✔ registry.json generated → .ev-lite/registry.json

evlite ui
# ✔ Serving: http://localhost:3137
```

`evlite scan` は `.ev-lite/registry.json` を生成します。各 `EvidenceNode` には frontmatter 由来のメタデータに加えて、scan 時に集計された `importance`（`reference_count`、`pack_dependency_count`）と `derived_tags`（`NEW` / `OLD` / `CORE` / `COLD` / `SUPERSEDED` など）が格納されます。UI はこのファイルを読み込むだけで、ソース markdown には**一切書き戻しません**。

---

## 2. frontmatter を付ける

EVLite は各 `.md` の YAML frontmatter からメタデータを読み取ります:

```yaml
---
ev_id: ev:stack.document-name   # グローバルに一意な ID（"ev:" + ドット区切り）
stack: docs                     # 所属 stack（通常は親ディレクトリ名）
status: active                  # active | draft | experimental | deprecated | archived | superseded | stale
tags: [core, spec]
depends_on: [ev:other.prereq]   # この文書なしでは理解できない前提
related:    [ev:other.context]  # 関連文書（必須ではない）
supersedes: [ev:old.version]    # 旧版を置き換える
---
```

frontmatter がないファイルに draft ブロックを挿入:

```powershell
evlite init-meta docs/architecture.md
```

リポジトリ全体に一括挿入:

```powershell
# PowerShell
Get-ChildItem -Recurse -Filter "*.md" | ForEach-Object {
  evlite init-meta $_.FullName
}
```

```bash
# bash / zsh
find . -name "*.md" | xargs -I{} evlite init-meta {}
```

frontmatter を編集・挿入したら `evlite scan`（または UI の **Scan ▶** ボタン）で registry を更新します。

---

## 3. リポジトリを俯瞰する — `Dirs` タブ

UI の **Dirs** タブはリポジトリのツリービューです。各行に直下の `.md` ファイル数が表示され、`▶` で遅延展開します（ディレクトリごとに 1 回だけサーバ呼び出し）。

ディレクトリを選択すると右ペインに直下のファイル一覧が表示されます:

- `ev_id` と相対パス
- 明示的な `status` バッジ（`active` / `draft` …）
- scan が付与した **DerivedTag** すべて

DerivedTag は成果物の健康状態を一目で示します:

| Tag | 意味 |
|---|---|
| `NEW` / `RECENT` / `OLD` | `updated_at` から導出される鮮度（≤30日 / ≤90日 / ≥365日） |
| `STALE` | `status: stale` が明示されている |
| `SUPERSEDED` | `status: superseded` または他ノードの `supersedes:` に登場 |
| `ACTIVE` / `ARCHIVED` / `EXPERIMENTAL` | `status` から導出されるライフサイクル |
| `CORE` | `reference_count ≥ 10`（他から多く参照されている） |
| `HOT` | `pack_dependency_count ≥ 3`（多くの pack に含まれる） |
| `FOUNDATIONAL` | `CORE` かつ `OLD` — 長期間使われ続けている基盤文書 |
| `COLD` | 参照ゼロ、pack 依存ゼロ |

ディレクトリ行から 2 種類の遷移ができます:

- **ファイルクリック** → **Metadata Editor** タブに切り替わり、対象ファイルが選択された状態になります。
- **→ Snapshot** → **Snapshot** タブに切り替わり、`path` フォームにディレクトリパスが入力済みになります。

---

## 4. Context Pack を作る — `Pack Builder` タブ

**Context Pack** とは AI に渡す構造化プロンプトです。読むべき文書、推論してはいけない事項、出力の形を指定します。pack は `.ev-lite/packs/<name>.json` に保存され、必要に応じて `pack.md` にレンダリングされます。

1. **Pack Builder → New** でフォームを開きます:
   - `id` — `pack:<name>`（保存後は不変）
   - `goal` — AI に達成してほしいこと
   - `mustRead[]` — 必読文書の `ev_id`
   - `doNotInfer[]` — 推論で勝手に補ってほしくない事項
   - `outputGoal[]` — 期待する出力の形
2. `mustRead` の入力は手打ち以外に 2 つの補助があります:
   - **[ + Add from registry ]** — 全 `ev_id` ノードから検索・複数選択。重複は自動で除外。
   - **[ + From report/handover ]** — 全 `EVReport` と `HandoverReport` を一覧表示。行を展開すると候補 ev_id（report の `required_packs_for_continuation`、handover の `must_read`）が表示され、まとめてチェック → 追加できます。
3. **Related** セクション（Phase 4 で追加）には `ev_id` または `pack:` で始まる関連リンクを `mustRead` を汚さずに紐付けられます。同じピッカーを使います。
4. **Save Pack** → **Generate pack.md** で markdown を生成。**Copy** ボタンで Claude / ChatGPT に貼り付けます。

**AI が生成した pack JSON のインポート:** **[ Import JSON ]** ボタン → ContextPack JSON をペースト。`ContextPackSchema`（zod）で検証してから保存します。エラーはフィールドごとにモーダル内に表示されます。

CLI から生成:

```powershell
evlite pack my-pack            # → .ev-lite/packs/my-pack.md
```

---

## 5. コードスナップショットを生成する

snapshot は **AI 転送用の成果物**であり、source of truth ではありません。ディレクトリや import グラフを 1 つの `snapshot.md` にまとめます。

**ディレクトリスナップショット**（パス配下を全部）:

```powershell
evlite snapshot packages/core/src --stack core
```

**依存スナップショット**（`--deps` で entrypoint からの static import を辿る）:

```powershell
evlite snapshot packages/core/src/index.ts --deps --max-depth 10
# skip した import（alias / external / dynamic / missing）はレポートされます
```

**一発生成 `evlite context`** — dep snapshot + その entrypoint を mustRead に含めた Context Pack を同時生成:

```powershell
evlite context packages/core/src/index.ts --goal "review for cycle bugs"
# → snapshot.md  +  pack.json（snapshot を mustRead に登録済み）
```

UI の **Snapshot** タブは上記すべてのオプションに加えて、よく使うパスの **Favorites** を備えています。UI から生成すると自動的に `scan` も再実行されます。

生成された snapshot は registry に `EvidenceNode` として登録されるため、pack の mustRead に `ev:<stack>.snapshot-<name>` として参照できます。

---

## 6. 実装記憶を残す — `Reports` タブ

意味のある作業を区切るたびに EVReport を scaffold して、判断の根拠を次の AI セッションに渡せる形で残します:

```powershell
evlite report cycle-detection --kind implementation --stack core
# → artifacts/reports/cycle-detection.report.md
```

生成される frontmatter には手で埋める構造化フィールドが並びます:

- `goal` / `modified_areas` / `semantic_impact` / `architectural_consequences`
- `remaining_risks` / `known_assumptions` / `unresolved_contradictions`
- `required_packs_for_continuation` — **次の pack への橋渡し**
- `suggested_next_actions` / `related_reports`

**Reports** タブで一覧と詳細を確認できます。重要なのは `required_packs_for_continuation` で、これは Pack Builder の **[ + From report/handover ]** ピッカーが候補として表示する値そのものです。ループをコピペなしで閉じられます。

---

## 7. セッション間で引き継ぐ — `Handovers` タブ

**HandoverReport** は EVReport より短く、*前回*ではなく*次回*セッションに向けた申し送りです:

```powershell
evlite handover my-session
# → artifacts/handovers/my-session.handover.md
```

UI の **Handovers** タブの "New Handover" パネルからも CLI なしで作成できます。

埋める内容:

- `goal` — 次セッションのねらい
- `current_state` — どこまで終わったか
- `next_actions[]` — 具体的な次の手順
- `must_read[]` — 開始前に読むべき `ev_id`
- `optional_read[]` / `active_decisions[]` / `unresolved_questions[]` / `known_risks[]`

`evlite scan` は handover を `EvidenceNode` として登録し、`must_read` を依存グラフに自動で取り込みます。再開時は Pack Builder で **[ + From report/handover ]** → 該当 handover を展開 → `must_read` をワンクリックで次の pack に追加できます。

---

## 8. リポジトリを検証する

`evlite validate` は registry と pack を歩いて、壊れた参照を検出し健康指標を可視化します。フラグは自由に組み合わせ可能です。

**ベースラインチェック**（常時実行）:

- `ev_id` の重複
- `depends_on` / `supersedes` の参照先欠落
- `active` 文書が `deprecated` / `archived` を depends_on している
- pack の `mustRead` に superseded ノードが含まれる

**Importance シグナル** — 何が重要か?

```powershell
evlite validate --show-importance
```

```
─── IMPORTANCE REPORT ──────────────────────────────

TOP REFERENCED
  ev:dgc.constitution     refs: 24  packs: 8   CORE FOUNDATIONAL
  ev:traceos.spec         refs: 17  packs: 5   CORE

MOST PACK-DEPENDENT
  ev:dgc.constitution     packs: 8

COLD (unreferenced)
  ev:docs.old-design
```

**Risk シグナル** — 何が腐っているか?

```powershell
evlite validate --show-risk
```

```
─── RISK SIGNALS ───────────────────────────────────

ORPHAN (not referenced by any pack or node)
  ev:internal.scratch-notes

STALE (explicitly marked stale)
  ev:traceid.phase1

STALE DEPENDENCY
  pack:impl-phase1 → ev:traceid.phase1 (STALE)
```

**ピンポイント調査:**

```powershell
evlite validate --show-impact ev:dgc.constitution   # この id を参照しているのは誰?
evlite validate --focus ev:dgc.constitution         # 単一 ev_id の 1 ページサマリ
evlite validate --focus-dir packages/core           # ディレクトリ全体に対して同じ
evlite validate --affected packages/core/src/scan.ts --json
                                                    # 逆引き: このファイル変更で
                                                    # stale になった snapshot / pack
```

**ファイル出力:**

```powershell
evlite validate --show-importance --show-risk --output reports/validate.md
```

`--strict` はエラー時に `exit 1`。CI ゲートに組み込めます。

---

## 9. 典型的な AI ネイティブ開発ループ

全部つなげるとこうなります:

```
1. evlite scan
2. UI → Dirs タブ        ─ 健康状態を俯瞰: どこが CORE? どこが COLD?
3. UI → Pack Builder    ─ New → [ + From report/handover ] で前回の must_read を取り込み
                         → [ + Add from registry ] で周辺コンテキストを追加
                         → Generate pack.md
4. pack.md を Claude / ChatGPT に渡して作業を実行
5. evlite report <name> ─ 何が変わったかを記録、required_packs_for_continuation を埋める
6. evlite handover <name> ─ 明日のための must_read / next_actions をメモ
7. evlite validate --show-risk --strict   (CI ゲート)
   → STALE DEPENDENCY で superseded を指したままの pack を検出
8. 次のセッション: ステップ 3 に戻る。report と handover は
   ピッカーに既に並んでいるのでコピペ不要。
```

これが Document Context Routing System です。構造はあなたが決め、EVLite はそれを一貫した形に保ち続けます。

---

## さらに

- Constitution v0.5（哲学 + `DerivedTag` / `ImportanceScore` / `RiskSignal` の完全な導出ルール）: [Constitution_v0_5.md](Constitution_v0_5.md)
- 英語版: [GETTING_STARTED.md](GETTING_STARTED.md)
- リポジトリ直下の README: [../README.md](../README.md)
