---
ev_id: ev:docs.llm-command-quick-reference
stack: docs
status: active
tags: []
depends_on: []
related: []
supersedes: []
---

# evlite — LLM Command Quick Reference

> EvidenceVault Lite is a tool for structurally preparing context for AI systems.
> An LLM that reads this document should be able to autonomously use the commands below.

**Environment:** Windows PowerShell / `F:\OSS_project\evidence-vault-lite`

---

# Core Principles

```text
evlite is not Graph-RAG.

It is Canonical Context Routing:
humans define what the AI should read.

snapshot = code transfer artifact for AI
           (source files are canonical)

pack     = goal-oriented context bundle for AI
           (goal + mustRead + doNotInfer)

registry = index of all markdown documents in the repo
```

---

# Command Overview

| Command                              | Description                                                             |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `evlite scan`                        | Update `registry.json`                                                  |
| `evlite list`                        | List all nodes in the registry                                          |
| `evlite snapshot <path>`             | Convert a directory into `snapshot.md`                                  |
| `evlite snapshot <file> --deps`      | Trace dependencies from an entrypoint and snapshot only reachable files |
| `evlite context <file> --goal "..."` | Generate snapshot + pack in one command                                 |
| `evlite pack <pack-id>`              | Generate `pack.md` from `pack.json`                                     |
| `evlite validate`                    | Validate dependency/reference integrity                                 |
| `evlite validate --affected <file>`  | Reverse-lookup snapshots/packs affected by a file                       |
| `evlite report <name> --kind <kind>` | Scaffold an EVReport document                                           |
| `evlite handover <name>`             | Scaffold a HandoverReport document                                      |
| `evlite ui`                          | Launch local UI → `localhost:3137`                                      |

---

# Common Workflows

## 1. Prepare implementation context in one command

```powershell
evlite context packages/core/src/index.ts `
  --goal "add --output option to validate command" `
  --stack evlite
```

Output:

```text
✔ snapshot.md generated  → .ev-lite/snapshots/index.md
✔ ev_id                  → ev:evlite.snapshot-index
✔ pack.json saved        → .ev-lite/packs/context-index-{timestamp}.json
✔ pack.md generated      → .ev-lite/packs/context-index-{timestamp}.md
✔ pack_id                → pack:context-index-{timestamp}
```

Pass the generated `pack.md` directly to Claude Code, Codex, or another Executor agent.

---

## 2. Preview context without writing files (dry-run)

```powershell
evlite context packages/core/src/index.ts `
  --goal "..." --dry-run | ConvertFrom-Json
```

Inspect:

```text
_dryRun
_resolvedFiles
_skippedImports
```

before deciding to commit execution.

---

## 3. Snapshot only files reachable from an entrypoint

```powershell
# Tree only (no file contents)
evlite snapshot packages/core/src/index.ts --deps --no-content

# Generate snapshot.md
evlite snapshot packages/core/src/index.ts --deps --stack evlite

# Machine-readable JSON
evlite snapshot packages/core/src/index.ts --deps --json | ConvertFrom-Json
```

---

## 4. Analyze change impact

```powershell
# Human-readable
evlite validate --affected packages/core/src/snapshot.ts

# Machine-readable
evlite validate --affected packages/core/src/snapshot.ts --json | ConvertFrom-Json
```

Example output:

```text
Affected analysis for: packages/core/src/snapshot.ts

Snapshots containing this file:
  ev:evlite.snapshot-index  (.ev-lite/snapshots/index.md)

Packs referencing affected snapshots:
  pack:context-index-...  mustRead: ev:evlite.snapshot-index

1 snapshot(s), 1 pack(s) affected.
```

---

## 5. Reverse-lookup dependencies and validate integrity

```powershell
# Find docs/packs referencing an ev_id
evlite validate --show-impact ev:evlite.snapshot-index

# Detect orphaned nodes
evlite validate --show-orphans

# Show all node information inside a directory
evlite validate --focus-dir packages/core/src/
```

---

## 6. Record implementation result as EVReport

```powershell
evlite report my-impl --kind implementation --stack evlite
# → artifacts/reports/my-impl.report.md
```

Edit the generated file (fill in `goal`, `modified_areas`,
`required_packs_for_continuation`, etc.), then:

```powershell
evlite scan
evlite validate --show-impact ev:evlite.report-my-impl
```

The report's `required_packs_for_continuation` is surfaced by the UI's
Pack Builder `[ + From report/handover ]` picker for the next pack.

---

## 7. Hand off session state as HandoverReport

```powershell
evlite handover my-session
# → artifacts/handovers/my-session.handover.md
```

Fill in: `goal` / `current_state` / `next_actions` / `must_read`.

Then `evlite scan` to register, and include the handover in your next
pack's `mustRead` (via UI picker or by editing the pack JSON).

---

## 8. Inspect repository health

```powershell
# Top referenced nodes (CORE / HOT / FOUNDATIONAL surfaced inline)
evlite validate --show-importance

# Risk signals (orphan / stale / superseded / stale-dependency)
evlite validate --show-risk

# Save full report to file
evlite validate --show-importance --show-risk --output health-report.md
```

Example output:

```text
─── IMPORTANCE REPORT ──────────────────────────────

TOP REFERENCED
  ev:dgc.constitution     refs: 24  packs: 8   CORE FOUNDATIONAL
  ev:traceos.spec         refs: 17  packs: 5   CORE

MOST PACK-DEPENDENT
  ev:dgc.constitution     packs: 8

COLD (unreferenced)
  ev:docs.old-design

─── RISK SIGNALS ───────────────────────────────────

ORPHAN (not referenced by any pack or node)
  ev:internal.scratch-notes

STALE DEPENDENCY
  pack:impl-phase1 → ev:traceid.phase1 (STALE)
```

---

# Snapshot Options Quick Reference

| Option            | Description                                      |
| ----------------- | ------------------------------------------------ |
| `--stack <stack>` | Frontmatter stack value                          |
| `--output <path>` | Output file path                                 |
| `--no-content`    | Tree only (omit code contents)                   |
| `--deps`          | Dependency traversal mode from entrypoint        |
| `--max-depth <n>` | Max dependency traversal depth (default: 10)     |
| `--include-tests` | Include `.spec.ts` / `.test.ts` files            |
| `--no-dep-tree`   | Omit Dependency Tree section                     |
| `--dry-run`       | Resolve dependencies without writing snapshot.md |
| `--json`          | Output DepGraph JSON to stdout                   |

---

# Report Options Quick Reference

| Option            | Description                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `--kind <kind>`   | `implementation` / `analysis` / `architecture` / `research` / `incident` / `observer` / `retrospective` (default: `implementation`) |
| `--stack <stack>` | Frontmatter stack value (default: `docs`)                                                                                  |
| `--output <path>` | Output file path (default: `artifacts/reports/<name>.report.md`)                                                           |

---

# Handover Options Quick Reference

| Option            | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| `--output <path>` | Output file path (default: `artifacts/handovers/<name>.handover.md`)   |

---

# Context Options Quick Reference

| Option            | Description                               |
| ----------------- | ----------------------------------------- |
| `--goal <text>`   | **Required.** Goal/instruction for the AI |
| `--stack <stack>` | Frontmatter stack value                   |
| `--max-depth <n>` | Max dependency traversal depth            |
| `--no-content`    | Omit snapshot file contents               |
| `--force`         | Overwrite existing pack                   |
| `--dry-run`       | Output preview JSON without writing files |

---

# Validate Options Quick Reference

| Option                  | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `--affected <file>`     | Reverse-lookup snapshots/packs affected by a file                |
| `--json`                | Output `--affected` result as JSON                               |
| `--show-impact <ev_id>` | Find docs/packs referencing an ev_id                             |
| `--show-orphans`        | List unreferenced nodes                                          |
| `--show-depends`        | Show depends_on / related / supersedes topology                  |
| `--show-cycles`         | Detect circular dependencies                                     |
| `--show-chains`         | Display supersedes chains derived from topology                  |
| `--show-importance`     | Show TOP REFERENCED / MOST PACK-DEPENDENT / COLD nodes           |
| `--show-risk`           | Show ORPHAN / STALE / SUPERSEDED / STALE DEPENDENCY signals      |
| `--focus <ev_id>`       | Show all information for an ev_id                                |
| `--focus-dir <path>`    | Show all information for nodes in a directory                    |
| `--active-only`         | With `--show-depends`: skip superseded related nodes             |
| `--output <path>`       | Save validate output to a file                                   |
| `--strict`              | Exit with code 1 if any ERROR exists                             |

---

# Recommended Planner Workflow

```text
1. Understand repo structure
   evlite snapshot packages --no-content

2. Narrow scope using dependency traversal
   evlite snapshot packages/core/src/index.ts --deps --no-content

3. Check impact of planned modifications
   evlite validate --affected <target-file>

4. Compile execution context
   evlite context <entrypoint> --goal "..."

5. Pass generated pack.md to Executor
```

---

# Stdout Contract (Important)

```text
--json mode:
  stdout = valid JSON only
  stderr = diagnostics/errors

  → Safe to pipe directly into:
      ConvertFrom-Json
      jq
      JSON.parse()

Normal mode:
  stdout = human-readable text
  stderr = diagnostics/errors
```

---

# DepGraph JSON Structure

```json
{
  "mode": "deps",
  "entrypoint": "packages/core/src/index.ts",
  "root": ".",
  "files": [
    "packages/core/src/index.ts",
    "..."
  ],
  "edges": [
    [
      "packages/core/src/index.ts",
      "packages/core/src/scan.ts"
    ]
  ],
  "skipped": [
    {
      "from": "...",
      "specifier": "@ev-lite/shared",
      "reason": "alias"
    }
  ],
  "summary": {
    "fileCount": 12,
    "edgeCount": 17,
    "skippedCount": 31,
    "maxDepth": 10,
    "includeTests": false
  }
}
```

---

# `skipped.reason` Values

| Reason                  | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| `external`              | `node_modules` dependency                 |
| `alias`                 | Workspace alias such as `@ev-lite/shared` |
| `missing`               | Referenced file does not exist            |
| `unsupported-extension` | Non TS/JS file (`.css`, `.json`, etc.)    |
| `dynamic-variable`      | `import(variable)` dynamic expression     |
| `excluded`              | `.spec.ts` / `.test.ts` excluded          |
| `max-depth`             | Dependency traversal depth exceeded       |

---

# Conceptual Model

```text
D1:
  file → DepGraph
  (machine-readable reachability)

D2:
  file + goal → agent workspace
  (snapshot + pack compiler)

D3a:
  file → affected snapshots + packs
  (staleness / impact reverse lookup)
```

Together these form the foundation for:

```text
- Agent Context Routing
- Reachability-based execution scopes
- AI workspace compilation
- Context replayability
- Change impact analysis
```

---

*EvidenceVault Lite — LLM Command Quick Reference*
*Target version: evlite 0.1.x (Phase 4)*
*Created: 2026-05-27*
