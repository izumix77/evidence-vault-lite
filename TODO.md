---
ev_id: 'ev:evidence-vault-lite.TODO'
stack: evidence-vault-lite
status: active
tags:
  - todo
depends_on:
  - 'ev:docs.Constitution_v0_5'
related: []
supersedes: []
---

# EVLite — 機能追加 & TODO（確定版）

**作成日:** 2026-05-21
**対象:** EvidenceVault Lite (evidence-vault-lite)
**Constitution 基準:** v0.5（本 TODO と同時確定）
**参照設計メモ:**
- `EVLite — Handover Type & Auto Tag Extraction Design Memo`
- `EVLite — Report Design v0.2`

---

## ステータス凡例

| 記号 | 意味 |
|------|------|
| ✅ | 実装済み |
| 🔴 | Phase 4 最優先 |
| 🟠 | Phase 4 優先 |
| 🟡 | Phase 4 後半 |
| ⬜ | Phase 5 以降 |

---

## 1. `@ev-lite/shared` — 型定義追加

### 1-A. EvidenceStatus 拡張 🔴

```ts
// 追加する値
| "superseded"  // 他の artifact に置き換えられた
| "stale"       // 明示的な陳腐化マーク
```

- [ ] `EvidenceStatus` union に `"superseded"` / `"stale"` を追加
- [ ] zod スキーマを更新
- [ ] `effectiveStatus()` との整合確認（topology 導出 vs 明示指定の優先関係）

### 1-B. EvidenceNode 拡張 🟠

```ts
// 追加するフィールド
derived_tags?: DerivedTag[]
importance?:  ImportanceScore
```

- [ ] `EvidenceNode` に `derived_tags` / `importance` フィールドを追加
- [ ] zod スキーマを更新

### 1-C. HandoverReport 型 🔴

Constitution v0.5 §2.5 の型定義をそのまま実装する。

- [ ] `HandoverReport` 型を追加
- [ ] zod スキーマを追加
- [ ] frontmatter パーサーで `type: "handover"` を認識

### 1-D. EVReport 型 🔴

Constitution v0.5 §2.6 の型定義をそのまま実装する。
`report_kind: "implementation"` が Constitution v0.4 の Implementation Report の完全な上位互換。

- [ ] `EVReport` 型 / `EVReportKind` 型を追加
- [ ] zod スキーマを追加
- [ ] frontmatter パーサーで `type: "report"` / `report_kind` を認識

### 1-E. ImportanceScore 型 🟡

- [ ] `ImportanceScore` 型を追加
- [ ] zod スキーマを追加

### 1-F. DerivedTag 型 🟠

- [ ] `DerivedTag` union 型を追加（Constitution v0.5 §2.8 の値一覧）

### 1-G. RiskSignal 型 🟡

- [ ] `RiskSignal` 型 / `RiskSignalType` 型を追加

---

## 2. `@ev-lite/core` — ロジック追加

### 2-A. scan での HandoverReport / EVReport 認識 🔴

- [ ] `evlite scan` 時に `type: "handover"` / `type: "report"` を検出して `registry.json` に登録
- [ ] `HandoverReport.must_read` の ev_id を依存グラフの参照対象に含める
- [ ] `EVReport.required_packs_for_continuation` を参照対象に含める

### 2-B. Auto Tag 導出（Freshness + Lifecycle）🟠

Constitution v0.5 §2.8 の `deriveTags()` を実装する。

- [ ] `deriveTags(doc: EvidenceNode): DerivedTag[]` を `@ev-lite/core` に追加
- [ ] `evlite scan` 時に `derived_tags` を各 `EvidenceNode` に付与して `registry.json` に格納
- [ ] frontmatter へは**書き戻さない**（read-only）

### 2-C. ImportanceScore 集計 🟡

- [ ] `evlite scan` 時に全 node の `reference_count` / `pack_dependency_count` を集計
- [ ] `EvidenceNode.importance` に格納して `registry.json` に書き込む
- [ ] Auto Tag 導出の Usage Tags（HOT / CORE / COLD / FOUNDATIONAL）はこの集計後に発火

### 2-D. validate — --show-impact 🔴

```
evlite validate --show-impact ev:flowmemo.ui-patterns

Impact:
  Packs:   pack:impl-active-object-icon
  Docs:    ev:flowmemo.focus-trail
  Reports: ev:flowmemo.report-active-object-icon
```

- [ ] 逆引きインデックスを `registry.json` から構築
- [ ] HandoverReport の `must_read` / EVReport の `required_packs_for_continuation` も対象に含める

### 2-E. validate — --show-orphans 🟠

- [ ] どの pack / node からも参照されていない node を列挙

### 2-F. validate — --show-depends 🟠

- [ ] `depends_on` / `related` / `supersedes` の構造をツリー表示
- [ ] `--active-only` オプション: superseded でない related のみ表示

### 2-G. validate — --show-cycles 🟠

- [ ] `depends_on` / `supersedes` の循環を検出

### 2-H. validate — --show-importance 🟡

- [ ] `ImportanceScore` と `DerivedTag` の一覧を表示

### 2-I. validate — RiskSignal 出力 🟡

Constitution v0.5 §2.9 の 3 種を検出して出力する。

- [ ] `stale_dependency` — pack / report / handover の `must_read` / `depends_on` が OLD または STALE な文書を参照している検出
  - ※ 「エージェントが繰り返し参照」の検出は agent usage 履歴が必要なため Phase 5 に回す
- [ ] `knowledge_bottleneck` — 複数 pack が同一 SUPERSEDED pack に依存している検出
- [ ] `semantic_monoculture` — HOT 文書が canonical でない検出

### 2-J. validate — --output オプション 🟠

validate の出力をファイルに保存する。EVReport として registry に登録・管理できる。

```powershell
evlite validate --show-depends --show-chains --show-orphans --output validate-report.md
```

- [ ] `--output <path>` オプションを追加
- [ ] 指定した path に validate の全出力を書き込む
- [ ] `--show-*` オプションと自由に組み合わせ可能

### 2-K. validate — --focus / --focus-dir 🟠

特定の node またはフォルダに関連する全情報を一括出力する。

```powershell
evlite validate --focus ev:AgentRelay.xxx --output focus-report.md
evlite validate --focus-dir AgentRelay/ --output agentrelay-report.md
```

- [ ] `--focus <ev_id>` — 指定 node の impact / depends / chains を一括表示
- [ ] `--focus-dir <path>` — フォルダ内全 node の情報を一括表示
- [ ] `--output` と組み合わせてファイル出力可能

---

## 3. `@ev-lite/cli` — コマンド追加

### 3-A. evlite handover 🟠

HandoverReport のスキャフォールドを生成する。

```bash
evlite handover my-session
# → ev:handover.my-session として frontmatter 付き .md を生成
```

- [ ] `evlite handover <name>` コマンドを追加
- [ ] Constitution v0.5 §3.2 の frontmatter テンプレートを出力

### 3-B. evlite report 🟠

EVReport のスキャフォールドを生成する。

```bash
evlite report my-impl --kind implementation --stack dgc
# → ev:dgc.report-my-impl として frontmatter 付き .md を生成
```

- [ ] `evlite report <name> --kind <kind> --stack <stack>` コマンドを追加
- [ ] Constitution v0.5 §3.3 の frontmatter テンプレートを出力

---

## 4. `@ev-lite/server` — API 追加

### 4-A. GET /api/dirs 🔴

- [ ] サーバー側ディレクトリブラウザ API を実装

### 4-B. GET /api/handovers 🟡

- [ ] registry.json から `type: "handover"` の node を返すエンドポイント

### 4-C. GET /api/reports 🟡

- [ ] registry.json から `type: "report"` の node を返すエンドポイント

---

## 5. `evlite-ui` — UI 追加

### 5-A. Directory Browser タブ 🟠

- [ ] `GET /api/dirs` ベースのディレクトリブラウザを追加

### 5-B. Handover タブ 🟡

- [ ] HandoverReport 一覧表示
- [ ] 新規 HandoverReport 作成フォーム（`evlite handover` 相当の UI）
- [ ] `must_read` の ev_id オートコンプリート

### 5-C. Report タブ 🟡

- [ ] EVReport 一覧表示（Constitution v0.4 の "Implementation Report 登録 UI" をこちらで実装）
- [ ] 新規 EVReport 作成フォーム（report_kind セレクタ付き）
- [ ] `required_packs_for_continuation` の pack 候補サジェスト

### 5-D. Metadata Editor — DerivedTag バッジ 🟡

- [ ] `derived_tags` を読み取り専用バッジとして表示（NEW / OLD / STALE / FOUNDATIONAL など）

### 5-E. Pack Builder — mustRead Reorder ✅

**Design Principle:** `mustRead` is ordered context, not an unordered set.
AI は先に読んだ文脈に強く引っ張られるため、順序は context routing の一部として扱う。

- [x] mustRead list に drag handle を表示し、drag & drop で順序変更できるようにする
- [x] ↑ / ↓ ボタンでも順序変更可能にする
- [x] 保存時に `pack.json` の `mustRead` 配列順を更新
- [ ] `@ev-lite/core` の pack.md 生成がこの順序をそのまま採用していることを確認・テスト追加

### 5-F. evlite ui — マルチルート対応（--port / settings.json）✅

複数の root を同時に別ポートで立ち上げられるようにする。
例：`evidence-vault-lite` 開発用と `dgc-ecosystem-docs` 参照用を並走。

**--port オプション（cli）:**

```powershell
evlite ui --root F:\dgc-ecosystem-docs --port 3138
```

**settings.json（root ごとのデフォルト設定）:**

```json
// F:\dgc-ecosystem-docs\.ev-lite\settings.json
{
  "port": 3138
}
```

優先順位: `--port オプション` > `settings.json` > デフォルト `3137`

- [x] `evlite ui` に `--port <number>` オプションを追加（cli）
- [x] `.ev-lite/settings.json` のパースと `port` フィールドの読み込み（core）
- [x] 優先順位の適用（`--port` > `settings.json` > `3137`）
- [x] 起動ログに使用ポートを表示（既存の `✔ Serving: http://localhost:{port}` で対応）

### 5-G. ヘッダーへのリポジトリ名表示 ✅

- [x] `registry.root` の basename をヘッダーに表示（`App.tsx`）
- [x] 初期状態（root が空）では非表示
- [x] Windows パス（`\`）対応
- [x] `.app-header-repo` スタイル追加（`App.css`）

### 5-H. MetadataEditor — stack mismatch 警告 ✅

- [x] `← path` ボタンを追加（stack をフォルダ名から自動入力）
- [x] stack が path のフォルダ名と一致しない場合にボタンを orange / bold で強調
- [x] 一致している場合はボタンを disabled
- [x] hover の title に期待値を表示（`stack mismatch — expected "xxx"`）
- [x] ev_id の stack 部分も同時に置換

### 5-I. スクロールバーのスタイル統一 ✅

- [x] `::-webkit-scrollbar` / `track` / `thumb` / `thumb:hover` を dark theme に合わせて追加（`App.css`）

### 5-J. settings.json description フィールド ✅

- [x] `EvLiteSettings` に `description?: string` を追加
- [x] 起動ログに description を表示（`settings.description` がある場合のみ）

### 5-K. ファイルリスト — ソート切り替え 🟠

- [ ] 名前順（現在のデフォルト）/ status順 / scan順 の3択切り替えを追加
- [ ] status順: `active → draft → experimental → deprecated → archived → superseded → stale`
- [ ] scan順: registry の登録順（`registry.json` の配列順）
- [ ] 切り替えは UI 上部のボタンまたはセレクタで操作
- [ ] server / core の変更は不要（UI 側のみ）

### 5-L. Pack Builder — Import JSON 🟠

AI が生成した pack.json 構造を UI から直接インポートできるようにする。

**ワークフロー:**
```
Claude に「このタスクの pack を JSON で作って」と依頼
→ Claude が ContextPack 構造の JSON を出力
→ Pack Builder の [ Import JSON ] ボタンをクリック
→ JSON を貼り付け → pack.json として保存
→ そのまま Generate pack.md へ
```

- [ ] Pack Builder に [ Import JSON ] ボタンを追加
- [ ] JSON 入力用モーダル or テキストエリアを表示
- [ ] 貼り付けた JSON を ContextPackSchema で parse / validate
- [ ] parse 成功時: Pack Builder のフォームに反映して Save Pack
- [ ] parse 失敗時: エラーメッセージを表示
- [ ] server / core の変更は不要（UI 側のみ）

---

## 6. 実装優先順位まとめ

> **優先順位の思想:**
> 「AIを強くする」ではなく「認知資産を壊れにくくする」を優先する。
> impact / report / graph introspection を先に置き、派手な Agent 機能は後回し。

| 優先 | タスク | 場所 | 規模 |
|------|--------|------|------|
| ✅ | Pack Builder — mustRead Reorder（drag & drop + ↑↓）| ui | S |
| ✅ | `evlite ui --port` + `settings.json` 対応 | cli / core | S |
| ✅ P1 | `evlite validate --show-impact` | core / cli | S |
| ✅ P2-a | `EvidenceStatus` に `superseded` / `stale` を追加 | shared | XS |
| ✅ P2-b | `EVReport` 型 + zod + scan 認識（Implementation Report 標準化） | shared / core | S |
| ✅ P2-c | `evlite report` コマンド（スキャフォールド生成） | cli | S |
| ✅ P3-a | `GET /api/reports` | server | XS |
| ✅ P3-b | Report タブ UI | ui | M |
| ✅ P4 | `evlite validate --show-orphans` | core / cli | S |
| ✅ P5 | `evlite validate --show-depends`（`--active-only` オプション追加予定） | core / cli | S |
| ✅ P6 | `evlite validate --show-cycles` | core / cli | S |
| ✅ P6-ext-a | `evlite validate --output` オプション | core / cli | S |
| ✅ P6-ext-b | `evlite validate --focus` / `--focus-dir` オプション | core / cli | S |
| 🟠 P6.5 | ファイルリスト ソート切り替え（名前順 / status順 / scan順） | ui | S |
| 🟠 P6.6 | Pack Builder — Import JSON | ui | S |
| 🟡 P7-1 | `HandoverReport` 型 + zod + scan 認識 | shared / core | S |
| 🟡 P7-2 | `evlite handover` コマンド | cli | S |
| 🟡 P7-3 | `GET /api/handovers` + Handover タブ UI | server / ui | M |
| ✅ P8 | Prompt Vault 拡張（Pack Builder 拡張） | ui | M |
| ⬜ P8-debt | `related: []` 保存時の空配列 vs 省略を統一（pack diff が増える前に） | ui / shared | XS |
| 🟡 P9-a | `DerivedTag` 型 + `deriveTags()` + scan への組み込み | shared / core | S |
| 🟡 P9-b | `ImportanceScore` 集計 + Usage Tags | core | M |
| 🟡 P9-c | validate `--show-importance` / RiskSignal 出力 | core / cli | M |
| 🟡 P9-d | Metadata Editor DerivedTag バッジ | ui | S |
| 🟡 P9-e | `GET /api/dirs` + Directory Browser UI | server / ui | M |
| ⬜ — | ObserverAI への RiskSignal パイプライン | Phase 5 | L |
| ✅ | snapshot --deps（依存追跡モード） | shared / core / cli / ui / server | M |
| ✅ | snapshot --deps --dry-run / --json（machine-readable contract）| shared / core / cli | S |
| ✅ | evlite context（Agent Context Compiler）| core / cli | M |
| ✅ | validate --affected（source file → snapshot → pack 逆引き）| core / cli | S |

---

## 7. 確定した設計決定事項

- `HandoverReport` / `EVReport` はどちらも `supersedes` / `superseded_by` を持ち `effectiveStatus()` の対象
- `derived_tags` は `registry.json` にのみ格納する。frontmatter には**書き戻さない**（kernel neutrality）
- `importance.explicit_priority` は人間が設定。derived 値はそれを上書きしない
- `EVReport.unresolved_contradictions` は意図的な保存フィールド。AI が矛盾を暗黙に解消しないようにするため
- `RiskSignal` の解釈はUI / ObserverAI が行う。core は検出・出力のみ
- `evlite report` の `report_kind: "implementation"` は Constitution v0.4 の "Implementation Report" の完全な上位互換
- `stale` は `deprecated` とは別に残す（`deprecated` = 設計上非推奨、`stale` = 時間経過による陳腐化）
- `ContextPack.mustRead` は順序付きコンテキストとして扱う。AI は先に読んだ文脈に引っ張られるため、順序は context routing の一部である。型変更は不要（既に `string[]`）。pack.md 生成は配列順をそのまま採用する

---

_EVLite — 機能追加 & TODO（確定版）_
_Constitution v0.5 基準_
_作成: 2026-05-21_

---

## 8. 実装済み追加機能

### 8-A. evlite snapshot --deps ✅

**実装日:** 2026-05-26

エントリーポイントから静的 import/export を再帰的に追跡し、
到達可能なファイルのみを snapshot する依存追跡モード。

```
deps mode is a reachability snapshot, not a glob snapshot.
Only files reachable from the entrypoint through supported static relative imports are included.
Skipped imports MUST be reported, not silently ignored.
```

**追加ファイル:**
- `packages/shared/src/deps.ts` — `DepGraph` / `DepSkip` / `DepSkipReason` 型
- `packages/core/src/deps.ts` — `resolveDeps()` / `renderDepTree()` / `renderSkippedTable()`
- `packages/core/src/__tests__/deps.test.ts` — 9 tests all green

**修正ファイル:**
- `packages/core/src/snapshot.ts` — deps モード分岐（glob path 無変更）
- `packages/cli/src/commands/snapshot.ts` — `--deps` / `--max-depth` / `--include-tests` / `--no-dep-tree`
- `packages/server/src/routes/snapshot.ts` — 4 フィールド追加（explicit destructure のため）
- `apps/evlite-ui/src/types.ts` — `SnapshotInput` / `SnapshotResult` 拡張
- `apps/evlite-ui/src/components/SnapshotBuilder.tsx` — deps モード UI

**使用例:**
```powershell
evlite snapshot packages/core/src/index.ts --deps --stack evlite
evlite snapshot packages/core/src/index.ts --deps --max-depth 5
evlite snapshot packages/core/src/index.ts --deps --no-content
```

**既知の out-of-scope（v0.1）:**
- side-effect import（`import "./polyfill"` 形式）
- `require()` CommonJS
- `tsconfig.paths` エイリアス解決

**v0.1.1 修正:** `.js` 拡張子付き specifier（TypeScript ESM の `export * from "./scan.js"` 形式）が
実在する `.ts` ファイルに解決されない不具合を修正。`resolveSpecifier()` に `.js` → `.ts/.tsx` fallback を追加。

### 8-B. evlite snapshot --deps --dry-run / --json ✅ (Phase D1)

**実装日:** 2026-05-27

dependency snapshot の machine-readable 出力モードを追加。

- `--dry-run`: ファイルを書かずに解決結果を stdout に出力
- `--json`: DepGraph を JSON で stdout に出力（Agent interoperability contract）

**Stdout Contract:**
- `--json` の stdout は valid JSON のみ（picocolors / checkmark 禁止）
- stderr に診断メッセージを分離

**追加ファイル:**
- `packages/shared/src/deps.ts` — `DepGraphJsonOutput` 型
- `packages/core/src/deps.ts` — `toDepGraphJsonOutput()` ヘルパー

**修正ファイル:**
- `packages/cli/src/commands/snapshot.ts` — `--dry-run` / `--json` フラグ追加
- `packages/cli/src/index.ts` — オプション登録

---

### 8-C. evlite context — Agent Context Compiler ✅ (Phase D2)

**実装日:** 2026-05-27

`evlite context <entrypoint> --goal "..."` を1コマンドで実行すると、
dependency snapshot の生成から pack.json / pack.md の出力まで完結する。

```powershell
evlite context packages/core/src/index.ts --goal "implement --output option" --stack evlite
```

**dry-run モード:**
- `generateSnapshot()` を呼ばず `resolveDeps()` のみ実行
- ファイルを一切書かない
- stdout: `ContextDryRunResult` の JSON のみ（`_dryRun: true` を含む）

**追加ファイル:**
- `packages/core/src/context.ts` — `generateContext()` / `generateContextDryRun()`
- `packages/cli/src/commands/context.ts` — `context` コマンド

---

### 8-D. evlite validate --affected — Reverse Lookup ✅ (Phase D3a)

**実装日:** 2026-05-27

source file path を渡すと、そのファイルを含む snapshot と
その snapshot を `mustRead` に持つ pack を逆引きして列挙する。

```powershell
evlite validate --affected packages/core/src/snapshot.ts
evlite validate --affected packages/core/src/snapshot.ts --json
```

**snapshot path 解決:** `node.path` → `node.filePath` → `node.source` → fallback（frontmatter ev_id 走査）の4段階。

**既知の限界（v0.1）:** 部分文字列マッチのため `snap.ts` が `snapshot.ts` に誤ヒットする可能性あり。v0.2 で `## {path}` セクションパーサーに改善予定。

**追加ファイル:**
- `packages/core/src/affected.ts` — `findAffected()`
- `packages/cli/src/commands/validate.ts` — `--affected` / `--json` オプション追加
