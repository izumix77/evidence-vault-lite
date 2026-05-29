---
ev_id: 'ev:evidence-vault-lite.CHANGELOG'
stack: evidence-vault-lite
status: draft
tags: []
depends_on: []
related: []
supersedes: []
---

# Changelog

All notable changes to EvidenceVault Lite are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — Phase 5

### Planned
- AgentRelay integration
- TraceOS / DGC connection
- ObserverAI RiskSignal pipeline
- `knowledge_bottleneck` / `semantic_monoculture` RiskSignal
- `recent_reference_count` / `last_referenced_at` aggregation

---

## [0.1.4] — Observability (Phase 4, 2026-05)

### Added

DerivedTag engine:
- `DerivedTag` type — Freshness (`NEW` / `RECENT` / `OLD` / `STALE`), Lifecycle (`ACTIVE` / `SUPERSEDED` / `ARCHIVED` / `EXPERIMENTAL`), Usage (`HOT` / `CORE` / `COLD` / `FOUNDATIONAL`)
- `deriveTags()` — pure function, topology-aware via `effectivelySuperseded`
- scan integration — `derived_tags` written to `registry.json`, never to frontmatter (kernel neutrality)

ImportanceScore aggregation:
- `reference_count` / `pack_dependency_count` / `explicit_priority` fields
- Aggregated at scan time from `depends_on` / `related` / `supersedes` / pack `mustRead` / handover `must_read` / handover `optional_read`
- Usage Tags (`CORE` / `FOUNDATIONAL` / `HOT` / `COLD`) derived from ImportanceScore
- `explicit_priority` from frontmatter is preserved across rescans

validate flags:
- `--show-importance` — TOP REFERENCED / MOST PACK-DEPENDENT / COLD
- `--show-risk` — ORPHAN / STALE / SUPERSEDED / STALE DEPENDENCY
- `--show-chains` — supersedes chain display

UI:
- DerivedTag badges in Metadata Editor (read-only)
- Directory Browser (`Dirs` tab) — lazy tree, file health pane, `→ Snapshot` integration
- `GET /api/dirs` with path-traversal guard
- File list sort — Name / Status / Scan order

### Fixed
- `evlite scan` now uses `scanRepo()` — the previous manual path bypassed `derived_tags` and `importance` aggregation, so registries written by the CLI were missing those fields.

---

## [0.1.3] — Context Compiler (Phase D, 2026-05)

### Added
- `evlite context <entrypoint> --goal "..."` — snapshot + pack generation in one command
- `snapshot --deps` — dependency traversal mode from an entrypoint (static `import` / `export` tracing)
- `snapshot --deps --dry-run` / `--json` — machine-readable DepGraph output (stdout contract: stdout is valid JSON, diagnostics go to stderr)
- `validate --affected <file>` — reverse lookup: source file → snapshots → packs
- `validate --affected --json` — machine-readable output for downstream tooling

---

## [0.1.2] — Session Continuity (Phase 4, 2026-05)

### Added

HandoverReport:
- `HandoverReport` type + zod schema
- scan recognition (`type: "handover"`) — `must_read` merged into `depends_on` automatically
- `evlite handover <name>` — scaffold generation
- `GET /api/handovers`, `POST /api/handover`
- Handovers tab UI (list + create form, `must_read` count badge)

Prompt Vault (Pack Builder extensions):
- Registry picker — add `ev_id` to `mustRead` from the full registry (searchable, multi-select, dedupe)
- Report/Handover picker — use `EVReport.required_packs_for_continuation` and `HandoverReport.must_read` as `mustRead` candidates
- Related artifacts field — `ContextPack.related` (optional `string[]`)
- Import JSON modal — paste and validate `ContextPack` JSON via `ContextPackSchema`

validate extensions:
- `--focus <ev_id>` — all info for a single node
- `--focus-dir <path>` — same, scoped to a directory
- `--output <path>` — save validate output to a file (composable with any `--show-*` flag)

---

## [0.1.1] — Implementation Reports (Phase 4, 2026-05)

### Added

EVReport:
- `EVReport` type + `EVReportKind` + zod schema
- scan recognition (`type: "report"`)
- `evlite report <name> --kind <kind> --stack <stack>` — scaffold generation
- `GET /api/reports`
- Reports tab UI (list + detail view)

EvidenceStatus extensions:
- Added `superseded` and `stale` to the `EvidenceStatus` union

validate topology inspection:
- `--show-impact <ev_id>` — reverse lookup (docs / packs / reports referencing the id)
- `--show-orphans` — unreferenced nodes
- `--show-depends` — `depends_on` / `related` / `supersedes` tree (with `--active-only` to skip superseded `related` edges)
- `--show-cycles` — circular dependency detection

UI improvements:
- File list sort control (Name / Status / Scan order)
- Pack Builder Import JSON

---

## [0.1.0] — Core MVP (Phase 1–3, 2026-04)

### Added

Core scanning:
- `evlite scan` — `registry.json` generation
- `EvidenceNode` type + zod schema
- `effectiveStatus()` — topology-derived superseded detection
- `depends_on` / `related` / `supersedes` graph

Context Pack:
- `ContextPack` type + zod schema
- `evlite pack <id>` — `pack.md` generation from `pack.json`
- Pack Builder UI (`mustRead` reorder with drag & drop)

Snapshot:
- `evlite snapshot <path>` — code snapshot to `snapshot.md`
- Snapshot Builder UI with Favorites

CLI:
- `evlite init-meta` — frontmatter insertion
- `evlite list` — registry node listing
- `evlite validate --show-chains` / `--strict`
- `evlite ui --root` / `--port`

Server:
- `GET /api/registry` / `/api/files` / `/api/file`
- `PUT /api/file`
- `GET` / `PUT` / `DELETE /api/packs/:id`
- `POST /api/packs/:id/build`
- `POST /api/scan` / `/api/snapshot`
- `GET /api/favorites` / `POST` / `DELETE`

UI:
- Metadata Editor — frontmatter editing + stack mismatch warning
- Pack Builder — `pack.json` editing + `pack.md` generation + Copy
- Snapshot Builder — path input + Favorites + Generate
- Repository name in header
- Multi-root support via `--port` / `settings.json`
