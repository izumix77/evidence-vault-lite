---
ev_id: 'ev:docs.GETTING_STARTED'
stack: docs
status: active
tags:
  - GETTING_STARTED
depends_on: []
related:
  - 'ev:evidence-vault-lite.README'
  - 'ev:docs.GETTING_STARTED.ja'
supersedes: []
---

# EvidenceVault Lite — Getting Started Guide

> Deliver only the context AI needs — through human-defined structure.

---

## Overview

EvidenceVault Lite adds frontmatter to your existing markdown documents
and generates **Context Packs (pack.md)** to pass structured context to AI tools.

This is not Graph-RAG.
It is **Canonical Context Routing** — you define what the AI should read.

---

## Prerequisites

- Node.js 22+
- pnpm 10+
- Git

---

## Step 1: Setup

### Clone and build

```bash
git clone https://github.com/izumix77/evidence-vault-lite
cd evidence-vault-lite
pnpm install
pnpm build
```

### Make the command available (Windows PowerShell)

Global install is not supported due to `workspace:*` dependencies.
Add a function to your PowerShell Profile instead.

```powershell
# Open your profile
notepad $PROFILE
```

Add the following line and save:

```powershell
function evlite { node "C:\path\to\evidence-vault-lite\packages\cli\dist\index.js" @args }
```

Reload the profile:

```powershell
. $PROFILE
evlite --version   # Should print 0.1.0
```

### Make the command available (macOS / Linux)

```bash
# Add to ~/.bashrc or ~/.zshrc
alias evlite="node /path/to/evidence-vault-lite/packages/cli/dist/index.js"
```

---

## Step 2: Introduce to an existing repo

Navigate to your repo and run scan.

```bash
cd /path/to/your-repo
evlite scan
```

Example output:
```
✔ Scanned 83 files
✔ 2 frontmatter blocks found
✔ registry.json generated → .ev-lite/registry.json
```

This generates `.ev-lite/registry.json` — an index of all markdown files in the repo.

---

## Step 3: Launch the UI

```bash
evlite ui --root /path/to/your-repo
```

Example output:
```
✔ EvidenceVault Lite UI
✔ Serving: http://localhost:3137
✔ Root: /path/to/your-repo
```

The browser opens automatically at `http://localhost:3137`.

> If the port is already in use:
> ```powershell
> # Windows
> Get-NetTCPConnection -LocalPort 3137 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
> ```

---

## Step 4: Insert frontmatter into all files at once

When you open the UI, you'll see a large number of files in the `No Metadata` section.
Use `evlite init-meta` to insert frontmatter in bulk.

```bash
# Linux / macOS
find . -name "*.md" | xargs -I{} evlite init-meta {}

# Windows PowerShell
Get-ChildItem -Recurse -Filter "*.md" | ForEach-Object {
    evlite init-meta $_.FullName
}
```

Example output:
```
✔ frontmatter inserted → docs/README.md
✔ frontmatter inserted → docs/architecture.md
WARN: frontmatter already exists in docs/GLOSSARY.md — skipped
```

The inserted frontmatter looks like this:

```yaml
---
ev_id: ev:docs.README        ← inferred from filename
stack: docs                  ← inferred from directory name
status: draft
tags: []
depends_on: []
related: []
supersedes: []
---
```

Then update the registry:

```bash
evlite scan
```

Reload the UI — all files will move to the `With Metadata` section.

---

## Step 5: Edit frontmatter in the UI

### File list

The left pane shows files **grouped by stack / directory**.

```
▼ WITH METADATA (83)
  ▼ dgc (12)
      ev:dgc.constitution — Constitution.md
      ev:dgc.types — types.md
  ▼ traceos (8)
      ev:traceos.constitution — CONSTITUTION.md
▼ NO METADATA (0)
```

Click a group name or section header to collapse / expand.

### Metadata Editor

Click a file to open the Metadata Editor in the right pane.

| Field | Meaning | Example |
|---|---|---|
| `ev_id` | Globally unique ID | `ev:dgc.constitution` |
| `stack` | Owning stack | `dgc` |
| `status` | Active state | `active` |
| `tags` | Search / classification tags | `core, spec` |
| `depends_on` | Required prerequisite documents | `ev:dgc.constitution` |
| `related` | Related documents (optional) | `ev:dgc.types` |
| `supersedes` | Replaces an older version | `ev:dgc.constitution-v0-1` |

**Field semantics:**

```
depends_on = prerequisite — cannot be understood without this
related    = related — useful reference, not required
supersedes = replaces an older version of this document
```

The `depends_on` / `related` / `supersedes` fields show autocomplete suggestions
from the registry when you type `ev:`.

Click **[ Save Metadata ]** to write the updated frontmatter back to the `.md` file.

### Set important files to active

```yaml
status: active    ← included in Context Packs (important documents)
status: draft     ← draft (included only when explicitly referenced)
status: archived  ← archived (never included)
```

---

## Step 6: Snapshot your code

You can pass **source code itself** to AI — not just documentation.

```bash
evlite snapshot packages/core/src --stack dgc
```

Example output:
```
✔ Scanned 9 files
✔ snapshot.md generated → .ev-lite/snapshots/src.md
✔ ev_id: ev:dgc.snapshot-src
```

The generated snapshot.md looks like this:

```md
# Directory: packages/core/src

## Tree
packages/core/src/
  index.ts
  apply.ts
  types.ts
  ...

---

## index.ts
\`\`\`ts
// file contents
\`\`\`

## apply.ts
\`\`\`ts
// file contents
\`\`\`
```

**You can also generate snapshots from the UI:**
Open the Snapshot tab → enter a path → click [ Generate Snapshot ]

> Snapshots are transfer artifacts, not source of truth.
> `source files are canonical. snapshot is an AI transfer artifact.`

After generating a snapshot, update the registry:

```bash
evlite scan
```

---

## Step 7: Create a Context Pack

### Build the pack in the UI

Open the **Pack Builder tab** in the UI.

| Field | Meaning |
|---|---|
| `id` | Pack identifier (`pack:my-pack` — immutable after creation) |
| `goal` | What you want the AI to do |
| `mustRead` | List of ev_ids the AI must read |
| `doNotInfer` | Things the AI must not infer |
| `outputGoal` | Expected output from the AI |

Example:

```json
{
  "id": "pack:glassbox-overview",
  "goal": "Understand GlassBox architecture and design principles",
  "mustRead": [
    "ev:glassbox.readme",
    "ev:glassbox.readme-ja",
    "ev:glassbox.todo"
  ],
  "doNotInfer": [
    "Do not assume implementation details not in the docs"
  ],
  "outputGoal": [
    "Explain GlassBox's core concepts",
    "Identify dependencies on DGC/TraceOS"
  ]
}
```

Click **[ Save Pack ]** to save to `.ev-lite/packs/glassbox-overview.json`.

### Generate pack.md

Click **[ Generate pack.md ]** to see the preview.
Use the **[ Copy ]** button in the top-right to copy to clipboard.

You can also generate from the CLI:

```bash
evlite pack glassbox-overview
# → .ev-lite/packs/glassbox-overview.md
```

---

## Step 8: Pass pack.md to AI

Paste the generated pack.md directly into ChatGPT / Claude Project.

```
# Context Pack — Understand GlassBox architecture and design principles

> Generated by EvidenceVault Lite 0.1.0
> Pack ID: pack:glassbox-overview

## Scope
Understand GlassBox architecture and design principles

## Output Goal
- Explain GlassBox's core concepts

## Do Not Infer
- Do not assume implementation details not in the docs

---

## Context

### GlassBox README
... (file contents)
```

The AI reads `goal` / `outputGoal` / `doNotInfer` as instructions
and uses the `mustRead` content as structured context.

---

## CLI Reference

| Command | Description |
|---|---|
| `evlite scan` | Scan repo → generate `registry.json` |
| `evlite snapshot <path>` | Snapshot code → generate `snapshot.md` |
| `evlite pack <pack-id>` | Generate `pack.md` from `pack.json` |
| `evlite init-meta <file>` | Insert frontmatter block |
| `evlite validate` | Check dependency and reference integrity |
| `evlite report <name>` | Generate an EVReport scaffold |
| `evlite ui` | Launch local UI → `localhost:3137` |

### snapshot options

| Option | Description |
|---|---|
| `--stack <stack>` | Stack value for frontmatter |
| `--output <path>` | Output file path |
| `--include <glob>` | File patterns to include (repeatable) |
| `--exclude <glob>` | File patterns to exclude (repeatable) |
| `--no-content` | Tree only, no file contents |

### validate options

| Option | Description |
|---|---|
| `--strict` | Exit 1 if any ERROR is found |
| `--show-chains` | Print supersedes chains |
| `--show-impact <ev_id>` | Show all docs and packs referencing the given ev_id |
| `--show-orphans` | List nodes not referenced by any doc or pack |
| `--show-depends` | Show depends_on / related / supersedes structure |
| `--show-cycles` | Detect circular dependencies |
| `--active-only` | With `--show-depends`: skip superseded related nodes |
| `--focus <ev_id>` | Show all info for the specified ev_id |
| `--focus-dir <path>` | Show all info for nodes in the specified directory |
| `--output <path>` | Save validate output to a file |

### report options

| Option | Description |
|---|---|
| `--kind <kind>` | Report kind: `implementation` / `analysis` / `architecture` / `research` / `incident` / `observer` / `retrospective` (default: `implementation`) |
| `--stack <stack>` | Stack value for frontmatter (default: `docs`) |
| `--output <path>` | Output file path (default: `artifacts/reports/<name>.report.md`) |

### ui options

| Option | Description |
|---|---|
| `--root <path>` | Root directory to serve |
| `--port <port>` | Port number (default: `3137`) |

> You can also set a default port per repo via `.ev-lite/settings.json`:
> ```json
> { "port": 3138, "description": "my-repo — reference UI" }
> ```

---

## Common Patterns

### Cross-repo consultation

Create a dedicated docs repo and collect documents from multiple repos:

```
dgc-ecosystem-docs/
  dgc_docs/
  traceos_docs/
  burnscope_docs/
  ...
```

```bash
cd dgc-ecosystem-docs
evlite scan
evlite ui
```

### Validate dependency integrity

```bash
evlite validate
```

```
WARN: ev:burnscope.mvp depends_on missing → ev:traceid.phase1
ERROR: duplicate ev_id → ev:traceid.phase1 (2 files)
```

### Recommended .gitignore

```
# generated artifacts — exclude
.ev-lite/registry.json
.ev-lite/snapshots/
.ev-lite/packs/*.md

# pack definitions — personal use only, do not commit to public repos
```

---

## Philosophy

```
EvidenceVault Lite does not search for relevance.
EvidenceVault Lite routes context by human-defined structure.

Not Graph-RAG. Canonical Context Routing.

Truth about what to read emerges outside the system.
```

---

_EvidenceVault Lite Getting Started Guide_
_Apache 2.0_
