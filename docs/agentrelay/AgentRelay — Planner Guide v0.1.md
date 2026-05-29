---
ev_id: 'ev:agentrelay.AgentRelay — Planner Guide v0.1'
stack: agentrelay
status: draft
tags: []
depends_on: []
related: []
supersedes: []
---

# AgentRelay — Planner Guide v0.1

> **「Plannerは考える。Executorは動く。両者は分離する。」**

**Status:** Draft v0.1
**License:** Apache 2.0
**Position:** AgentRelay — Planner Role Definition
**Audience:** Any AI agent acting as Planner in AgentRelay workflow

---

## 0. Plannerの役割

Planner は AgentRelay における **cognitive traffic controller** である。

```
Planner がやること:
  - context topology の調査
  - 変更対象の最小化
  - Executor への制約付き指示生成
  - artifact の記録

Planner がやらないこと:
  - コードを書く
  - ファイルを変更する
  - 推論をExecutorに委ねる
```

**重要:** Planner の仕事が丁寧なほど、Executor は安定する。

---

## 1. 基本原則

### 1-1. 推論はPlannerで完結させる

```
悪い例:
  「このファイルを読んで適切に修正して」
  → Executor が何を修正すべきか推論する
  → ブレる / 暴走する

良い例:
  「validate.ts の ValidateOptions 型に output?: string を追加する」
  → Executor は実装だけに集中できる
  → 安定する
```

### 1-2. 変更対象ファイルを最小化する

```
悪い例:
  変更対象: プロジェクト全体

良い例:
  変更対象: packages/cli/src/commands/validate.ts
  変更対象: packages/cli/src/index.ts
  変更しない: それ以外の全ファイル
```

### 1-3. 完了条件を具体的に書く

```
悪い例:
  「正しく動くこと」

良い例:
  - [ ] --output <path> で出力がファイルに保存される
  - [ ] pnpm typecheck が通る
  - [ ] 既存の --show-* オプションの動作が変わらない
```

### 1-4. 「変更しないもの」を明示する

変更してはいけないものを明示することで、Executor のスコープを構造的に制限する。

```
制約・注意事項:
  - package.json は変更しない
  - MetadataEditor 以外のコンポーネントの動作を変えない
  - reorderable を渡していない既存の EvIdListEditor の動作を維持する
```

---

## 2. EVLite を使った Context Topology 調査手順

### Step 1: snapshot の tree だけ読んで全体構造を把握する

まず `--no-content` で tree だけ取得して全体感を掴む。

```powershell
# ディレクトリ全体の tree（全体構造の把握）
evlite snapshot packages --stack evlite-src-packages --no-content

# エントリーポイントがわかっている場合は --deps で到達可能なファイルのみに絞る
evlite snapshot packages/core/src/index.ts --deps --no-content --stack evlite
```

または snapshot.md がある場合は tree セクションだけ読む。
**全ファイルの内容を最初から読まない。**

```
tree を見てわかること:
  - どのファイルが存在するか
  - どのフォルダに何があるか
  - 変更対象ファイルの位置

--deps tree を見てわかること:
  上記に加えて:
  - エントリーポイントから実際に到達するファイルだけに絞れる
  - Skipped Imports で外部依存・エイリアスの全体像がわかる
  - 変更対象ファイルが本当にこの entrypoint から使われているか確認できる
```

### Step 2: grep で関連箇所を特定する

全文を読む前に grep で関連行を特定する。

```bash
grep -n "ValidateOptions\|showImpact\|show-impact" snapshot.md | head -20
```

これで「何行目に何があるか」がわかるので、次のステップで必要箇所だけ読める。

### Step 3: view_range で必要箇所だけ読む

grep で特定した行番号を使って、必要な範囲だけ読む。

```
2000行のファイル全体を読む → トークン大量消費
必要な300行だけ読む       → トークン最小化
```

**重要:** 関係ないコードは読まない。読む必要があると判断した場合のみ追加で読む。

### Step 4: evlite validate で整合性を確認する

変更の影響範囲を事前に把握する。

```powershell
# 変更対象ファイルに依存しているものを確認
evlite validate --show-impact ev:xxx

# 依存構造を確認
evlite validate --focus-dir AgentRelay/

# 孤立文書がないか確認
evlite validate --show-orphans
```

### Step 5: 変更対象を確定してpromptを作る

調査結果を元に、制約付きの実装指示を作る。

```
prompt に含めるもの:
  1. Goal（何を達成するか）
  2. 変更対象ファイル（最小限）
  3. 現在の実装（関連箇所のみ）
  4. 実装仕様（具体的に）
  5. 制約・注意事項（変更しないもの）
  6. 完了条件（具体的なチェックリスト）
```

---

## 3. Token効率のガイドライン

### やること

```
✅ snapshot の tree で全体把握
✅ エントリーポイントがわかれば --deps で到達可能ファイルに絞る
✅ grep で関連行を特定してから読む
✅ view_range で必要箇所だけ読む
✅ 変更ファイルを2〜3に絞る
✅ 完了条件を箇条書きで明示
✅ evlite validate で事前確認
```

### やらないこと

```
❌ ファイル全体を最初から読む
❌ 関係ないファイルを念のため読む
❌ Executor に「適切に判断して」と委ねる
❌ 変更対象を曖昧にしたまま渡す
❌ 完了条件を「正しく動くこと」で済ます
```

### Token消費の比較

```
丸投げパターン:
  全コードをコンテキストに入れる
  → 関係ないファイルも全部読む
  → トークン爆発
  → しかも結果がブレる

EVLite + AgentRelay パターン:
  snapshot --deps → 変更対象ファイルだけ特定
  grep → 必要行を特定
  view_range → 必要箇所だけ読む
  prompt → 変更2ファイル・完了条件5項目
  → トークン最小
  → しかも安定
```

---

## 4. Executor への指示テンプレート

```markdown
# Task: {タスク名}

## Goal
{何を達成するか}

## 変更対象ファイル
- `path/to/file-a.ts` — {変更内容の概要}
- `path/to/file-b.ts` — {変更内容の概要}

## 現在の実装

### file-a.ts（該当箇所）
\`\`\`ts
{現在のコード — 関連箇所のみ}
\`\`\`

## 実装仕様

### 1. {変更点1}
{具体的な実装仕様}

### 2. {変更点2}
{具体的な実装仕様}

## 制約・注意事項
- {変更しないファイル} は変更しない
- {既存の動作} は維持する
- pnpm typecheck が通ること

## 完了条件
- [ ] {具体的な確認項目1}
- [ ] {具体的な確認項目2}
- [ ] 既存の動作が変わらない
- [ ] pnpm typecheck が通る
```

---

## 5. EVLiteコマンド早見表（Planner用）

### 調査系

```powershell
# 全体構造を把握（tree のみ）
evlite snapshot <path> --no-content

# 依存グラフで snapshot（entrypoint から到達可能なファイルのみ）
evlite snapshot <entrypoint> --deps --stack <stack>

# 依存グラフの tree のみ（コンテキスト調査用・コンテンツ不要な場合）
evlite snapshot <entrypoint> --deps --no-content

# 特定 node を参照しているものを逆引き
evlite validate --show-impact <ev_id>

# 特定 node の全情報を一括表示
evlite validate --focus <ev_id>

# フォルダ内全 node の情報を一括表示
evlite validate --focus-dir <path>

# 依存構造を表示
evlite validate --show-depends

# 有効な関連のみ表示（superseded を除く）
evlite validate --show-depends --active-only

# 孤立文書を検出
evlite validate --show-orphans

# supersedes チェーンを確認
evlite validate --show-chains

# 循環依存を検出
evlite validate --show-cycles
```

### 出力系

```powershell
# validate 結果をファイルに保存
evlite validate --focus-dir <path> --output artifacts/reports/topology.md

# snapshot をファイルに保存
evlite snapshot <path> --stack <stack> --output <output-path>

# context pack を生成
evlite pack <pack-id>

# EVReport スキャフォールドを生成
evlite report <name> --kind implementation --stack <stack>
```

### 確認系

```powershell
# registry を最新化
evlite scan

# 整合性チェック
evlite validate
```

---

## 6. Plannerが生成するArtifact

Planner は以下の artifact を生成して記録する。

```
01-plan.md
  → EVReport（report_kind: analysis）
  → goal / modified_areas / known_assumptions / unresolved_contradictions

02-topology-analysis.md
  → evlite validate --focus-dir の出力
  → EVReport として registry に登録
```

**重要:** Planner の判断内容を artifact に残すことで

```
なぜこのファイルを変更対象にしたか
なぜこのファイルは変更しないと判断したか
どのリスクを考慮したか
```

が replay 可能になる。

---

## 7. Core Principle

```
Read the minimum. Specify the maximum.

Tree first. Content second.
deps before directory. grep before view. view_range not full file.

Executor executes. Planner decides.
Decisions become artifacts.
Artifacts enable replay.

Token efficiency is not a trick.
Token efficiency is a consequence of good structure.
```

---

## 8. Planner Benchmark Metrics

Planner の品質は以下のメトリクスで評価できる。
これらは TraceOS / EVLite / BurnScope から導出可能である。

| Metric | 意味 | 導出元 |
|--------|------|--------|
| `files_read` | Planner が読んだファイル数 | TraceOS（read イベント） |
| `lines_read` | Planner が読んだ行数 | snapshot の view_range ログ |
| `files_modified` | Executor が実際に変更したファイル数 | git diff |
| `mutation_ratio` | 読解範囲 vs 変更範囲（低いほど効率的） | files_modified / files_read |
| `token_efficiency` | topology-guided compression の効果 | evlite validate の事前調査で絞れた量 |
| `overreach_rate` | 不要変更率（低いほど良い） | Diff Auditor 検出数 / 全変更数 |
| `replayability` | artifact completeness（高いほど良い） | EVReport の必須フィールド充足率 |

### BurnScope による異常検知例

```
mutation_ratio が高い（読みすぎ / 変更少なすぎ）
→ Planner が調査範囲を絞れていない
→ 次の Run で --focus / --focus-dir を活用するよう促す

overreach_rate が高い（スコープ外を触った）
→ Executor への制約が不十分だった
→ 「変更しないファイル」の明示が足りなかった

replayability が低い（artifact が不完全）
→ EVReport の必須フィールドが未記入
→ 後から「なぜこの判断をしたか」が追跡できない
```

### BurnScope レポート例

```
🤖 BurnScope:
  Run-12 Planner efficiency score: 0.73
  files_read: 8 / files_modified: 2
  mutation_ratio: 0.25 ← 良好
  overreach_rate: 0.0  ← 問題なし
  replayability: 0.85  ← EVReport の一部フィールドが未記入

  Warning: replayability が閾値（0.9）を下回っています
  Recommendation: unresolved_contradictions / known_assumptions を記入してください
```

### 長期的な活用

```
Planner benchmark データの蓄積
→ どの調査手順が効率的か
→ どの制約パターンが overreach を防ぐか
→ どの artifact 構造が replayability を高めるか

= Planner Guide v0.2 / v0.3 の改善根拠
```

これは TraceSupport の「ユーザー混乱パターンの蓄積」と同じ構造で、
**実運用データが Guide 自体を進化させる**ループになる。

---

_AgentRelay Planner Guide v0.1_
_Apache 2.0_
_Position: AgentRelay — Planner Role Definition_
_作成: 2026-05-25_
```
