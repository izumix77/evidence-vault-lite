---
ev_id: 'ev:evidence-vault-lite.README'
stack: evidence-vault-lite
status: active
tags:
  - README
depends_on: []
related:
  - 'ev:docs.GETTING_STARTED'
  - 'ev:docs.GETTING_STARTED.ja'
supersedes: []
---

# EvidenceVault Lite (evlite)

> Deliver only the context AI needs — through human-defined structure.

Document Context Routing System for AI-native development. Not Graph-RAG. **Canonical Context Routing.**

## What it does

- Tag your `.md` files with frontmatter and let `evlite scan` build a queryable registry of your repo's evidence.
- Bundle the exact files an AI needs into a **Context Pack** (`pack.md`) you control — `mustRead`, `doNotInfer`, `outputGoal`.
- Read repo health at a glance via **DerivedTags** (`NEW` / `OLD` / `STALE` / `SUPERSEDED`) and **ImportanceScore** (`CORE` / `HOT` / `COLD` / `FOUNDATIONAL`).
- Carry context across sessions with **EVReport** (implementation memory) and **HandoverReport** (session-to-session continuation).

See [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) (English) / [docs/GETTING_STARTED.ja.md](docs/GETTING_STARTED.ja.md) (日本語) for the full workflow.

## Install (Windows / PowerShell)

`npm publish` is not yet available — build from source and shim `evlite`:

```powershell
git clone https://github.com/izumix77/evidence-vault-lite
cd evidence-vault-lite
pnpm install
pnpm build

# Add to your PowerShell profile so `evlite` is callable from any repo
notepad $PROFILE
# Append this line, replace the path:
function evlite { node "C:\path\to\evidence-vault-lite\packages\cli\dist\index.js" @args }
. $PROFILE
evlite --version
```

macOS / Linux: alias instead, e.g. `alias evlite='node /path/to/evidence-vault-lite/packages/cli/dist/index.js'`.

## Quick Start

```powershell
cd your-repo
evlite scan                 # 1. index every .md → .ev-lite/registry.json
evlite ui                   # 2. open http://localhost:3137
# 3. (UI) Dirs tab → click a file → Metadata Editor → fill ev_id / status
# 4. (UI) Pack Builder → New → [ + Add from registry ] → Save → Generate pack.md
# 5. paste pack.md into your AI tool
```

## CLI Commands

| Command | Description |
|---|---|
| `evlite scan` | scan repo → write `.ev-lite/registry.json` (incl. `importance` + `derived_tags`) |
| `evlite ui` | launch local UI → `http://localhost:3137` |
| `evlite snapshot <path>` | bundle a directory (or import graph with `--deps`) into a `snapshot.md` |
| `evlite context <entrypoint>` | one-shot: dep snapshot + Context Pack for a code entrypoint |
| `evlite pack <id>` | render `pack.md` from a saved `pack.json` |
| `evlite validate` | check registry integrity, topology, importance, and risk signals |
| `evlite report <name>` | scaffold an `EVReport` (implementation memory) |
| `evlite handover <name>` | scaffold a `HandoverReport` (next-session memo) |
| `evlite init-meta <file>` | insert a draft frontmatter block into a `.md` |

### `evlite validate` options

| Option | What it shows |
|---|---|
| `--show-impact <ev_id>` | every doc and pack that references this id |
| `--show-orphans` | nodes not referenced anywhere |
| `--show-depends` | full `depends_on` / `related` / `supersedes` adjacency |
| `--show-cycles` | circular dependencies in `depends_on` / `supersedes` |
| `--show-chains` | supersedes chains derived from topology |
| `--show-importance` | TOP REFERENCED / MOST PACK-DEPENDENT / COLD |
| `--show-risk` | ORPHAN / STALE / SUPERSEDED / COLD / STALE DEPENDENCY |
| `--focus <ev_id>` | one-page summary for a single ev_id |
| `--focus-dir <path>` | the same for every node in a directory |
| `--affected <file>` | reverse lookup: which snapshots and packs are affected by a file change |
| `--output <path>` | write the report to a file instead of stdout |
| `--strict` | exit `1` on any ERROR |

## UI Tabs

| Tab | What it's for |
|---|---|
| **Metadata Editor** | edit frontmatter, see DerivedTag badges (`NEW` / `OLD` / `CORE` …) on the selected file |
| **Pack Builder** | build Context Packs — registry picker, "From report/handover" Prompt Vault, JSON import, related artifacts |
| **Snapshot** | generate code snapshots (`--deps` and favorites available from the UI) |
| **Reports** | create + browse `EVReport` scaffolds |
| **Handovers** | create + browse `HandoverReport` scaffolds (`must_read` count surfaced) |
| **Dirs** | repo tree browser — directory drill-down, file health at a glance, jump to Metadata Editor or Snapshot tab |

## License

Apache 2.0
