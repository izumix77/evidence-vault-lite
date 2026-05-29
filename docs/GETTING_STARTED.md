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

# Getting Started with EVLite

> Deliver only the context AI needs — through human-defined structure.

This guide walks through every feature that ships in EVLite today (Phase 4 complete): scanning, the UI's six tabs, snapshots, Context Packs, Reports, Handovers, and the validate suite — ending with a typical AI-native loop you can adopt.

Prerequisites: Node.js 22+, pnpm 10+, Git.

---

## 1. Install & first scan

Build from source (`npm publish` is not yet available) and shim the `evlite` command:

```powershell
git clone https://github.com/izumix77/evidence-vault-lite
cd evidence-vault-lite
pnpm install
pnpm build
```

**Windows / PowerShell** — add a profile function:

```powershell
notepad $PROFILE
# Append, replacing the path:
function evlite { node "C:\path\to\evidence-vault-lite\packages\cli\dist\index.js" @args }
. $PROFILE
evlite --version   # → 0.1.0
```

**macOS / Linux:**

```bash
alias evlite='node /path/to/evidence-vault-lite/packages/cli/dist/index.js'
```

Then index your repo and open the UI:

```powershell
cd your-repo
evlite scan
# ✔ Scanned 83 files
# ✔ 2 frontmatter blocks found
# ✔ registry.json generated → .ev-lite/registry.json

evlite ui
# ✔ Serving: http://localhost:3137
```

`evlite scan` writes `.ev-lite/registry.json` — every `EvidenceNode` carries the parsed frontmatter plus computed `importance` (`reference_count`, `pack_dependency_count`) and `derived_tags` (`NEW` / `OLD` / `CORE` / `COLD` / `SUPERSEDED` …). The UI re-reads this file; nothing is ever written back to your source markdown.

---

## 2. Add frontmatter

EVLite reads metadata from each `.md` file's YAML frontmatter:

```yaml
---
ev_id: ev:stack.document-name   # globally unique id ("ev:" + dotted path)
stack: docs                     # owning stack (often the parent dir)
status: active                  # active | draft | experimental | deprecated | archived | superseded | stale
tags: [core, spec]
depends_on: [ev:other.prereq]   # cannot be understood without this
related:    [ev:other.context]  # related but not required
supersedes: [ev:old.version]    # this doc replaces an older one
---
```

To insert a draft block into a file that has none:

```powershell
evlite init-meta docs/architecture.md
```

To bulk-insert across the repo:

```powershell
# PowerShell
Get-ChildItem -Recurse -Filter "*.md" | ForEach-Object {
  evlite init-meta $_.FullName
}
```

```bash
# bash / zsh
find . -name "*.md" | xargs -I{} evlite init-meta {}
```

After editing or inserting frontmatter, run `evlite scan` (or click **Scan ▶** in the UI) to refresh the registry.

---

## 3. Browse your repository — `Dirs` tab

Open the **Dirs** tab in the UI for a tree view of the repo. Each row shows the directory name and the count of `.md` files directly inside it; `▶` expands lazily (one server call per directory).

Selecting a directory loads its files into the right pane with:

- the file's `ev_id` and relative path,
- the explicit `status` badge (`active` / `draft` / …),
- every **DerivedTag** the scan attached.

DerivedTags tell you the health of an artifact at a glance:

| Tag | Meaning |
|---|---|
| `NEW` / `RECENT` / `OLD` | Freshness derived from `updated_at` (≤30d / ≤90d / ≥365d) |
| `STALE` | Explicit `status: stale` |
| `SUPERSEDED` | Either `status: superseded` or another node lists this one in `supersedes:` |
| `ACTIVE` / `ARCHIVED` / `EXPERIMENTAL` | Lifecycle from `status` |
| `CORE` | `reference_count ≥ 10` — many other artifacts point here |
| `HOT` | `pack_dependency_count ≥ 3` — included in many packs |
| `FOUNDATIONAL` | `CORE` + `OLD` — long-lived bedrock document |
| `COLD` | Zero references, zero pack dependencies |

Two click targets from a directory row:

- **File click** → jumps to **Metadata Editor** with that file pre-selected.
- **→ Snapshot** → jumps to **Snapshot** tab with `path` pre-filled.

---

## 4. Create a Context Pack — `Pack Builder` tab

A **Context Pack** is the structured prompt you hand to an AI: which docs to read, which inferences are off-limits, what the deliverable looks like. Packs are stored as `.ev-lite/packs/<name>.json` and rendered to `pack.md` on demand.

1. **Pack Builder → New**, then fill the form:
   - `id` — `pack:<name>` (immutable after first save)
   - `goal` — what the AI should accomplish
   - `mustRead[]` — required reading (`ev_id`s)
   - `doNotInfer[]` — assumptions the AI must not invent
   - `outputGoal[]` — what shape of output you want
2. Populate `mustRead` without typing every id:
   - **[ + Add from registry ]** — searchable list of all `ev_id` nodes; multi-select; duplicates auto-skipped.
   - **[ + From report/handover ]** — surfaces every `EVReport` and `HandoverReport`. Expand a row to see the candidate ev_ids it nominates (a report's `required_packs_for_continuation`, a handover's `must_read`); check the ones you want and add them in one go.
3. **Related** section (new in Phase 4) lets you attach `ev_id` or `pack:`-prefixed cross-links without polluting `mustRead`. Use the same picker.
4. **Save Pack** → **Generate pack.md** to render the markdown bundle. Click **Copy** and paste into Claude / ChatGPT.

**Importing an AI-generated pack:** click **[ Import JSON ]**, paste a `ContextPack` JSON, and EVLite validates it against `ContextPackSchema` (zod) before saving. Mistakes surface as per-field errors inside the modal.

CLI equivalent:

```powershell
evlite pack my-pack            # → .ev-lite/packs/my-pack.md
```

---

## 5. Generate a code snapshot

Snapshots are **AI transfer artifacts** — never source of truth. They bundle a directory or import graph into a single `snapshot.md` you can paste into an AI tool.

**Directory snapshot** (everything under a path):

```powershell
evlite snapshot packages/core/src --stack core
```

**Dependency snapshot** (`--deps` traces static imports from an entrypoint):

```powershell
evlite snapshot packages/core/src/index.ts --deps --max-depth 10
# Reports any skipped imports — alias / external / dynamic / missing
```

**One-shot context** — dep snapshot + Context Pack for an entrypoint:

```powershell
evlite context packages/core/src/index.ts --goal "review for cycle bugs"
# → snapshot.md  +  pack.json registering it as mustRead
```

The **Snapshot** tab in the UI exposes all of these knobs plus a **Favorites** list of paths you use often. Generating from the UI also re-runs `scan` automatically.

After generating, the snapshot is itself an `EvidenceNode` in the registry — you can reference it from packs as `ev:<stack>.snapshot-<name>`.

---

## 6. Track implementation memory with `Reports`

When you finish a meaningful slice of work, scaffold an EVReport so the rationale survives the next AI session:

```powershell
evlite report cycle-detection --kind implementation --stack core
# → artifacts/reports/cycle-detection.report.md
```

The generated frontmatter includes structured fields you fill in by hand:

- `goal`, `modified_areas`, `semantic_impact`, `architectural_consequences`
- `remaining_risks`, `known_assumptions`, `unresolved_contradictions`
- `required_packs_for_continuation` — **the bridge to the next pack**
- `suggested_next_actions`, `related_reports`

Browse and review reports in the **Reports** tab. Critically, `required_packs_for_continuation` is exactly what the Pack Builder's **[ + From report/handover ]** picker surfaces — close the loop without copy-pasting ids.

---

## 7. Hand off between sessions — `Handovers` tab

A **HandoverReport** is shorter than a Report and aimed at the *next* session, not the previous one. Scaffold with:

```powershell
evlite handover my-session
# → artifacts/handovers/my-session.handover.md
```

Or use the **Handovers** tab's "New Handover" panel — same scaffold, no CLI needed.

Fill in:

- `goal` — what the next session is for
- `current_state` — where you left off
- `next_actions[]` — concrete steps
- `must_read[]` — `ev_id`s required reading before starting
- `optional_read[]`, `active_decisions[]`, `unresolved_questions[]`, `known_risks[]`

`evlite scan` registers handovers as `EvidenceNode`s and folds `must_read` into the dependency graph automatically. To resume, open Pack Builder, choose **[ + From report/handover ]**, expand your handover, and add its `must_read` ids to the next pack with one click.

---

## 8. Validate your repository

`evlite validate` walks the registry and packs to flag broken references and surface health metrics. Mix any flags freely.

**Baseline checks** (always on):

- duplicate `ev_id`
- missing `depends_on` / `supersedes` targets
- `active` doc depending on `deprecated` / `archived`
- pack `mustRead` containing a superseded node

**Importance signals** — who matters?

```powershell
evlite validate --show-importance
```

```
─── IMPORTANCE REPORT ──────────────────────────────

TOP REFERENCED
  ev:dgc.constitution     refs: 24  packs: 8   CORE FOUNDATIONAL
  ev:traceos.spec         refs: 17  packs: 5   CORE

MOST PACK-DEPENDENT
  ev:dgc.constitution     packs: 8

COLD (unreferenced)
  ev:docs.old-design
```

**Risk signals** — what's rotting?

```powershell
evlite validate --show-risk
```

```
─── RISK SIGNALS ───────────────────────────────────

ORPHAN (not referenced by any pack or node)
  ev:internal.scratch-notes

STALE (explicitly marked stale)
  ev:traceid.phase1

STALE DEPENDENCY
  pack:impl-phase1 → ev:traceid.phase1 (STALE)
```

**Targeted exploration:**

```powershell
evlite validate --show-impact ev:dgc.constitution   # who references this id?
evlite validate --focus ev:dgc.constitution         # full one-page summary
evlite validate --focus-dir packages/core           # same, scoped to a directory
evlite validate --affected packages/core/src/scan.ts --json
                                                    # reverse lookup: which snapshots / packs
                                                    # are stale because this file changed?
```

**Save the output:**

```powershell
evlite validate --show-importance --show-risk --output reports/validate.md
```

`--strict` makes errors fatal (`exit 1`) — drop it into CI.

---

## 9. A typical AI-native loop

Put it all together:

```
1. evlite scan
2. UI → Dirs tab        ─ survey health: which areas are CORE? COLD?
3. UI → Pack Builder    ─ New pack, [ + From report/handover ] pulls in the
                         last session's must_read, [ + Add from registry ]
                         tops up with surrounding context, Generate pack.md
4. Paste pack.md into Claude / ChatGPT and execute the work
5. evlite report <name> ─ record what changed, fill required_packs_for_continuation
6. evlite handover <name> ─ jot must_read / next_actions for tomorrow
7. evlite validate --show-risk --strict   (CI gate)
   → STALE DEPENDENCY catches packs still pointing at superseded docs
8. Next session: jump to step 3 — the report and handover are already
   in the picker, no copy-paste needed.
```

That's the routing system. The structure is yours; EVLite just keeps it consistent.

---

## More

- Constitution v0.5 (philosophy + the full `DerivedTag` / `ImportanceScore` / `RiskSignal` rules): [Constitution_v0_5.md](Constitution_v0_5.md)
- Japanese version of this guide: [GETTING_STARTED.ja.md](GETTING_STARTED.ja.md)
- README at the repo root: [../README.md](../README.md)
