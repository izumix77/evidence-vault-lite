---
ev_id: ev:evidence-vault-lite.TODO
stack: evidence-vault-lite
status: draft
tags: []
depends_on: []
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

---

## 6. 実装優先順位まとめ

> **優先順位の思想:**
> 「AIを強くする」ではなく「認知資産を壊れにくくする」を優先する。
> impact / report / graph introspection を先に置き、派手な Agent 機能は後回し。

| 優先 | タスク | 場所 | 規模 |
|------|--------|------|------|
| ✅ | Pack Builder — mustRead Reorder（drag & drop + ↑↓）| ui | S |
| ✅ | `evlite ui --port` + `settings.json` 対応 | cli / core | S |
| 🔴 P1 | `evlite validate --show-impact` | core / cli | S |
| 🔴 P2-a | `EvidenceStatus` に `superseded` / `stale` を追加 | shared | XS |
| 🔴 P2-b | `EVReport` 型 + zod + scan 認識（Implementation Report 標準化） | shared / core | S |
| 🔴 P2-c | `evlite report` コマンド（スキャフォールド生成） | cli | S |
| 🟠 P3-a | `GET /api/reports` | server | XS |
| 🟠 P3-b | Report タブ UI | ui | M |
| 🟠 P4 | `evlite validate --show-orphans` | core / cli | S |
| 🟠 P5 | `evlite validate --show-depends` | core / cli | S |
| 🟠 P6 | `evlite validate --show-cycles` | core / cli | S |
| 🟡 P7 | Prompt Vault 拡張（Pack Builder 拡張） | ui | M |
| 🟡 — | `HandoverReport` 型 + zod + scan 認識 | shared / core | S |
| 🟡 — | `evlite handover` コマンド | cli | S |
| 🟡 — | `GET /api/handovers` + Handover タブ UI | server / ui | M |
| 🟡 — | `DerivedTag` 型 + `deriveTags()` + scan への組み込み | shared / core | S |
| 🟡 — | `GET /api/dirs` + Directory Browser UI | server / ui | M |
| 🟡 — | `ImportanceScore` 集計 + Usage Tags | core | M |
| 🟡 — | validate `--show-importance` / RiskSignal 出力 | core / cli | M |
| 🟡 — | Metadata Editor DerivedTag バッジ | ui | S |
| ⬜ — | ObserverAI への RiskSignal パイプライン | Phase 5 | L |

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
