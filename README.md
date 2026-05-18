# EvidenceVault Lite

> Deliver only the context AI needs — through human-defined structure.

Document Context Routing System.

## Features

- Repo scanning and indexing
- `registry.json` generation
- Context Pack generation
- Markdown bundle output for AI tools
- YAML frontmatter metadata support

## Philosophy

EvidenceVault Lite does not search for relevance.
EvidenceVault Lite routes context by human-defined structure.

Not Graph-RAG. Canonical Context Routing.

Truth about what to read emerges outside the system.


## Quick Start (Development)

```bash
git clone ...
cd evidence-vault-lite
pnpm install
pnpm build
node packages/cli/dist/index.js scan
node packages/cli/dist/index.js ui
```

### Existing repo

```bash
cd your-repo

# 1. scan existing markdown files
evlite scan

# 2. open UI → add frontmatter to key documents
evlite ui

# 3. create a Context Pack
evlite pack my-pack

# 4. use pack.md with ChatGPT / Claude Project
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
| `evlite pack <pack-id>` | generate `pack.md` from `pack.json` |
| `evlite init-meta <file>` | insert frontmatter block |
| `evlite validate` | check dependency integrity |
| `evlite ui` | launch local UI → `localhost:3137` |

## License

Apache 2.0
