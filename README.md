---
ev_id: 'ev:evidence-vault-lite.README'
stack: evidence-vault-lite
status: active
tags: []
depends_on: []
related:
  - 'ev:docs.GETTING_STARTED'
  - 'ev:docs.GETTING_STARTED.ja'
supersedes: []
---

# EvidenceVault Lite

> Deliver only the context AI needs — through human-defined structure.

Document Context Routing System.

## Features

- Repo scanning and indexing
- `registry.json` generation
- Context Pack generation (`pack.md`)
- Code snapshot generation (`snapshot.md`)
- Markdown bundle output for AI tools
- YAML frontmatter metadata support
- Local web UI for metadata editing and pack building

## Philosophy

EvidenceVault Lite does not search for relevance.
EvidenceVault Lite routes context by human-defined structure.

Not Graph-RAG. Canonical Context Routing.

Truth about what to read emerges outside the system.

## Quick Start (Development)

```bash
git clone https://github.com/izumix77/evidence-vault-lite
cd evidence-vault-lite
pnpm install
pnpm build
node packages/cli/dist/index.js scan
node packages/cli/dist/index.js ui
```

## Installation

### Windows (PowerShell)

Global install via pnpm is not supported due to `workspace:*` dependencies.
Use a PowerShell function instead:

1. Open your PowerShell profile:

```powershell
notepad $PROFILE
```

2. Add the following line:

```powershell
function evlite { node "C:\path\to\evidence-vault-lite\packages\cli\dist\index.js" @args }
```

3. Reload the profile:

```powershell
. $PROFILE
```

4. Verify:

```powershell
evlite --version
```

### macOS / Linux

```bash
# coming soon: npm publish
```

## Usage

### Existing repo

```bash
cd your-repo

# 1. scan existing markdown files
evlite scan

# 2. open UI → add frontmatter to key documents
evlite ui

# 3. snapshot your code as context
evlite snapshot packages/core/src --stack my-stack

# 4. create a Context Pack
evlite pack my-pack

# 5. use pack.md with ChatGPT / Claude Project
```

### Frontmatter format

```yaml
---
ev_id: ev:stack.document-name
stack: your-stack
status: active
tags: [core, spec]
depends_on: []
related: []
supersedes: []
---
```

## CLI

| Command | Description |
|---|---|
| `evlite scan` | scan repo → generate `registry.json` |
| `evlite snapshot <path>` | generate code snapshot → `snapshot.md` |
| `evlite pack <pack-id>` | generate `pack.md` from `pack.json` |
| `evlite init-meta <file>` | insert frontmatter block |
| `evlite validate` | check dependency and topology integrity |
| `evlite report <name>` | generate an EVReport scaffold |
| `evlite ui` | launch local UI → `localhost:3137` |

### validate options

| Option | Description |
|---|---|
| `--strict` | exit 1 if any ERROR is found |
| `--show-chains` | display supersedes chains derived from topology |
| `--show-impact <ev_id>` | show all docs and packs referencing the given ev_id |
| `--show-orphans` | list nodes not referenced by any doc or pack |
| `--show-depends` | show depends_on / related / supersedes structure |
| `--show-cycles` | detect circular dependencies |
| `--active-only` | with `--show-depends`: skip superseded related nodes |
| `--focus <ev_id>` | show all info for the specified ev_id |
| `--focus-dir <path>` | show all info for nodes in the specified directory |
| `--output <path>` | save validate output to a file |

### snapshot options

| Option | Description |
|---|---|
| `--stack <stack>` | frontmatter stack value |
| `--output <path>` | output file path |
| `--include <glob>` | file patterns to include (repeatable) |
| `--exclude <glob>` | file patterns to exclude (repeatable) |
| `--no-content` | tree only, no file contents |

### report options

| Option | Description |
|---|---|
| `--kind <kind>` | report kind: `implementation` / `analysis` / `architecture` / `research` / `incident` / `observer` / `retrospective` (default: `implementation`) |
| `--stack <stack>` | frontmatter stack value (default: `docs`) |
| `--output <path>` | output file path (default: `artifacts/reports/<name>.report.md`) |

### ui options

| Option | Description |
|---|---|
| `--root <path>` | root directory to serve |
| `--port <port>` | port number (default: `3137`) |

> You can also set a default port per repo via `.ev-lite/settings.json`:
> ```json
> { "port": 3138, "description": "my-repo — reference UI" }
> ```

## Snapshot Semantics

```
snapshot is not source of truth.
source files are canonical.
snapshot is an AI transfer artifact.
```

## License

Apache 2.0
