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
| `evlite validate` | check dependency integrity |
| `evlite ui` | launch local UI → `localhost:3137` |

### snapshot options

| Option | Description |
|---|---|
| `--stack <stack>` | frontmatter stack value |
| `--output <path>` | output file path |
| `--include <glob>` | file patterns to include (repeatable) |
| `--exclude <glob>` | file patterns to exclude (repeatable) |
| `--no-content` | tree only, no file contents |

## Snapshot Semantics

```
snapshot is not source of truth.
source files are canonical.
snapshot is an AI transfer artifact.
```

## License

Apache 2.0
