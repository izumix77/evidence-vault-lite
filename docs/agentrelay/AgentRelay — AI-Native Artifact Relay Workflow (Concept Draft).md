---
ev_id: 'ev:agentrelay.AgentRelay — AI-Native Artifact Relay Workflow (Concept Draft)'
stack: agentrelay
status: draft
tags:
  - concept
depends_on: []
related:
  - 'ev:AgentRelay.AgentRelay — Overview v0.1'
supersedes: []
---

# AgentRelay — AI-Native Artifact Relay Workflow (Concept Draft)

## 1. What AgentRelay is

AgentRelay is a lightweight AI-native workflow model where agents collaborate through immutable artifacts rather than realtime shared memory or persistent agent swarms.

Core idea:

```text
Agents do not continuously synchronize.
Agents hand over structured artifacts.
```

Instead of:

```text
AI ↔ AI ↔ AI realtime conversation
```

AgentRelay uses:

```text
artifact → review → artifact → review
```

This makes AI collaboration:

* replayable
* inspectable
* cheap
* model-agnostic
* subscription-friendly
* boundary-oriented

---

# 2. Core Philosophy

## 2-1. Coordination is the real bottleneck

AgentRelay assumes that the main problem of multi-agent systems is not intelligence itself, but:

* synchronization
* context explosion
* responsibility ambiguity
* uncontrolled exploration
* hidden side effects
* observability loss

Therefore:

```text
Less synchronization.
More explicit handover.
```

---

## 2-2. Artifacts over conversations

Conversations are:

* transient
* difficult to replay
* difficult to audit
* scope-expanding

Artifacts are:

* static
* reviewable
* compressible
* reproducible
* AI-readable

Therefore AgentRelay treats artifacts as first-class workflow objects.

---

## 2-3. Roles define reachable context

In AgentRelay:

```text
Role != personality
Role = reachable documents + reachable files + allowed actions
```

Each agent only reads:

* role-specific packs
* approved handovers
* scoped repository areas
* constrained instructions

This minimizes accidental scope expansion.

---

# 3. Basic Workflow

Minimal flow:

```text
Human Request
  ↓
Planner
  ↓
Safety Verifier
  ↓
Executor
  ↓
Diff Auditor
  ↓
Human Commit
```

Each stage emits artifacts.

Example:

```text
01-plan.md
02-safety-review.md
03-execution-report.md
04-diff-audit.md
05-human-decision.md
```

---

# 4. Role Structure

## 4-1. Planner

Purpose:

* exploration
* alternative proposals
* design reasoning
* failure simulation

Allowed:

* broad reasoning
* architecture analysis
* proposal generation

Forbidden:

* mutation
* commit
* unrestricted execution

Planner is intentionally allowed to "think creatively."

---

## 4-2. Safety Verifier

Purpose:

* boundary validation
* policy validation
* scope validation

Checks:

* unexpected file access
* unauthorized paths
* permission escalation
* dangerous external actions
* policy violations

The verifier validates whether the proposed path stays inside allowed boundaries.

---

## 4-3. Executor

Purpose:

* deterministic execution
* approved modifications only

Executor should minimize creativity.

Executor only acts on:

* approved plans
* approved file scopes
* approved actions

---

## 4-4. Diff Auditor

Purpose:

* verify actual changes
* detect overreach

Checks:

```text
Requested change
vs
Actual change
```

Example:

```text
Requested:
README update

Actual:
README + package.json + lockfile
```

The auditor flags unexpected modifications.

---

## 4-5. Human Commit Authority

Final commit authority remains human.

AI may:

* propose
* review
* execute
* audit

But humans retain responsibility boundaries.

---

# 5. EV Lite Integration

AgentRelay is designed to work naturally with EvidenceVault Lite style artifacts.

Example structure:

```text
/evlite/run-pack/
  request.md
  todo.md
  constraints.md
  repo-map.md

  handovers/
    01-plan.md
    02-safety-review.md
    03-execution-report.md
    04-diff-audit.md

  snapshots/
  diffs/
```

This creates an AI-readable causal workflow history.

---

# 6. Run Packs

A Run Pack bundles the complete reasoning and execution trail.

A Git commit records:

```text
What changed
```

A Run Pack records:

```text
Why it changed
How it changed
What alternatives were rejected
What risks were considered
```

Therefore:

```text
Commit = result
Run Pack = causal story
```

---

# 7. Why AgentRelay Exists

AgentRelay is intentionally:

* simple
* cheap
* inspectable
* low infrastructure
* low synchronization
* subscription-compatible

It avoids:

* persistent agent swarms
* complex orchestration infrastructure
* centralized memory systems
* realtime synchronization overhead

Instead it embraces:

```text
ephemeral agents
+
structured handover
+
artifact-based coordination
```

---

# 8. Relationship to Existing Multi-Agent Systems

Most current multi-agent systems use:

* realtime chat orchestration
* shared memory
* swarm coordination
* queue-based execution

AgentRelay instead behaves more like:

```text
AI-native bureaucracy
+
artifact relay
+
causal workflow
+
lightweight governance
```

It resembles:

* bureaucratic review pipelines
* Git workflows
* CI/CD review gates
* administrative handover systems

more than autonomous realtime swarms.

---

# 9. Long-Term Direction

Possible future extensions:

* Scheduler Agents
* Usage-aware team composition
* Adaptive constitutions
* Cost-aware routing
* Reachability-based context packs
* BurnScope integration
* TraceOS event generation
* Constitution Engine integration

Potential direction:

```text
AgentRelay
→ lightweight AI-native organization runtime
```

without requiring heavy infrastructure.
