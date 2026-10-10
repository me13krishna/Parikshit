# Parikshit – System Architecture & Tech Stack

**Version:** 2.0 (Synthesized Final)  
**Date:** 10 October 2026  
**Status:** Developer Ready  

---

## 1. Architectural Drivers

| Driver | Implication |
|--------|-------------|
| Grounded answers | Citation verification is a first-class server-side step |
| Safety of untrusted code | All execution happens inside isolated Docker sandboxes |
| Evidence first | Every significant action produces a ledger entry |
| Human control | Explicit approval gates before any destructive or external action |
| Fast demo iteration | Modular monolith + SQLite for zero-ops local runs |
| Future extraction | Clear service boundaries even inside the monolith |

---

## 2. High-Level Architecture

```
+-------------------+       HTTPS / SSE        +----------------------------------+
|  Browser (User)   | <----------------------> |  Next.js Frontend (TypeScript)   |
+-------------------+                          |  Dashboard | Chat | Diff | Graph |
                                               |  Ledger | Battle View            |
                                               +----------------+-----------------+
                                                                | REST + SSE
                                                                v
                                               +----------------------------------+
                                               |  FastAPI Backend (Python)        |
                                               |  Routers | Services | Orchestrator|
                                               +----+----------+----------+-------+
                                                    |          |          |
                                         +----------+  +-------+---+  +---+----------+
                                         | SQLite    |  | Repo Store|  | LLM Gateway  |
                                         | (+ FTS5)  |  | (git/fs)  |  | (adapters)  |
                                         +-----------+  +-----+-----+  +------+------+
                                                              |                 |
                                                     +--------v--------+        v
                                                     | Sandbox Runner  |   External LLM
                                                     | (Docker, no net)|
                                                     +-----------------+
```

**Actors:** User (browser), external LLM provider, public Git hosts (read-only).

**Style:** Modular monolith with a hard sandbox execution boundary. Background worker (same codebase) handles long-running jobs (indexing, battles, self-heal).

---

## 3. Proposed Technology Stack

| Layer | Choice | Rationale | Alternatives Considered |
|-------|--------|-----------|-------------------------|
| **Frontend** | Next.js 14+ (App Router) + TypeScript + Tailwind + shadcn/ui | Fast, modern, excellent DX, SSE support | Remix, pure React SPA |
| **Backend** | FastAPI (Python 3.11+) | Async, OpenAPI auto-gen, excellent for AI tooling | Django, Node (Nest) |
| **Database** | SQLite (WAL mode) + FTS5 for MVP | Zero ops, single file, transactional, full-text | Postgres + pgvector from day 1 |
| **Repo Storage** | Local filesystem + gitpython / dulwich | Simple, works offline | S3 + bare repos |
| **Parsing / Indexing** | tree-sitter (Python + JS/TS grammars) | Accurate symbols & imports | Regex, Language Server |
| **Sandbox** | Docker (python:3.11-slim base) | Strong isolation, resource limits, no network | Firecracker, gVisor, plain subprocess |
| **LLM Gateway** | Custom adapter layer (OpenAI-compatible + Anthropic) | Provider flexibility, cost tracking, structured output | Direct SDK calls |
| **Queue / Jobs** | asyncio task groups + SQLite job table (MVP) | Simple | Celery + Redis, ARQ |
| **Graph Viz** | React Flow (or Cytoscape.js) | Interactive, good performance for <5k nodes | D3, custom canvas |
| **Auth (MVP)** | None / simple local token (optional) | Single-user demo | JWT, Clerk, Auth0 |
| **Observability** | structured JSON logs + correlation IDs | Enough for MVP | OpenTelemetry, Sentry |
| **Hosting (Demo)** | Local laptop + Docker Desktop or single cloud VM | Fastest | Kubernetes, Fly.io, Railway |

**Decision Flags for Review:**
- SQLite → Postgres migration path is designed (schema is mostly portable).
- tree-sitter is preferred over pure LLM-based symbol extraction for determinism.
- No vector DB in MVP; hybrid keyword + symbol retrieval first. Add embeddings only if needed.

---

## 4. Component Breakdown

| Component | Responsibility | Key Interfaces |
|-----------|----------------|----------------|
| **Web UI** | Repo dashboard, chat/Mentor, tours, diff viewer, battle view, graph, ledger | REST + SSE |
| **API Layer** | Validation, rate limiting, error envelopes, OpenAPI | `/api/v1/*` |
| **Ingestion Service** | Clone/unpack, language detection, size limits, commit SHA | `ingest(project)` |
| **Indexer** | Chunking, tree-sitter symbol extraction, import graph, FTS indexing | `index(revision)` |
| **Retrieval Service** | Hybrid search (FTS + symbol + import proximity) | `retrieve(query, k)` |
| **Citation Verifier** | Server-side validation of path + line ranges against actual files | `verify(citations)` |
| **Agent Orchestrator** | Role-based agent loops (Mentor, Builder, Adversary, Reviewer, Healer) | tool-calling + state machine |
| **Workspace Manager** | Create isolated checkouts, apply patches, compute diffs, cleanup | `create_workspace`, `apply_patch` |
| **Sandbox Runner** | Execute commands inside Docker (pytest, lint, etc.), collect artifacts | `run(cmd, workspace)` |
| **Ledger Service** | Append-only hash-chained entries, export | `append(entry)`, `export()` |
| **LLM Gateway** | Provider abstraction, retries, cost tracking, structured output enforcement | `chat(messages, tools)` |

---

## 5. Core Data & Control Flows

### 5.1 Ingestion & Indexing
1. User submits Git URL or ZIP.
2. Ingestion clones/unpacks to read-only store, records commit SHA, enforces limits.
3. Indexer walks tree, runs tree-sitter, builds chunks + symbols + import edges.
4. FTS5 index + symbol table written; job status streamed via SSE.
5. Ledger entry created for “project_ingested”.

### 5.2 Architecture Overview + Cited Q&A
1. Retrieval pulls relevant chunks/symbols.
2. LLM generates overview or answer with proposed citations.
3. Citation Verifier checks every citation against real files; strips or regenerates.
4. Response returned with status (grounded / partially_grounded / unsupported).
5. Ledger records the interaction.

### 5.3 Change Request (Vibe Coding)
1. User request → plan generated and shown.
2. On approval → isolated workspace created from current revision.
3. Builder agent produces patch → applied only inside workspace.
4. Diff computed and shown.
5. Optional checks (lint + tests) run in sandbox.
6. User approval gate → export patch or discard.
7. All steps ledgered.

### 5.4 AI vs AI Battle
1. Builder produces candidate patch (or uses existing).
2. Adversarial QA receives patch + context, generates challenges / new tests.
3. Challenges executed in sandbox.
4. Reviewer synthesizes findings into battle report + residual risks.
5. Multiple rounds possible; final report + all artifacts ledgered.

### 5.5 Self-Healing Loop
1. Baseline failure captured and frozen.
2. Reproduce in sandbox (must succeed in reproducing or → inconclusive).
3. Diagnose → ranked hypotheses with citations.
4. Patch proposed → applied in new attempt workspace.
5. Re-run failing test + regression set.
6. Verdict emitted; failed attempts reverted but diffs retained.
7. Ledger records every attempt and final verdict.

### 5.6 Ledger & Evidence
Every significant event appends a ledger entry containing:
- previous_hash
- content_hash
- event_type
- payload (JSON)
- timestamp
- related entity IDs

Export produces a self-contained evidence pack.

---

## 6. Data Models (Core Entities)

See `04_DATA_DICTIONARY_AND_SCHEMA.md` for full SQL schemas.

**Primary entities:**
- `projects` / `revisions`
- `files` / `chunks` / `symbols` / `import_edges`
- `tasks` / `plans` / `workspaces` / `patches`
- `sandbox_runs` / `test_results` / `evidence_artifacts`
- `agent_runs` / `battles` / `battle_rounds` / `agent_findings`
- `repair_attempts`
- `approvals`
- `ledger_entries`
- `jobs`

---

## 7. Trust Boundaries & Isolation

| Boundary | Mechanism |
|----------|-----------|
| Untrusted repo content | Treated as pure data; never executed outside sandbox |
| LLM context | Only retrieved excerpts + redacted content; tool allow-list |
| Code execution | Docker: `--network=none`, memory/CPU limits, non-root user, read-only rootfs where possible |
| User approval | Hard gate before any export/merge |
| Secrets | Never logged; never sent to LLM; .env only on host |

---

## 8. Error Handling Principles

- All API responses use a consistent envelope: `{ "ok": bool, "data": ..., "error": { "code", "message", "details" } }`.
- Long-running jobs are asynchronous; clients poll or subscribe via SSE.
- Sandbox failures are captured as structured `sandbox_runs` with exit code + logs.
- LLM failures trigger limited retries + fallback messages; never silent.
- Citation verification failures cause regeneration (once) or stripping.

---

## 9. Observability

- Structured JSON logs with `correlation_id`, `project_id`, `agent_role`, `job_id`.
- Every agent step logs input tokens, output tokens, latency, tool calls.
- Ledger itself is the primary audit trail.
- Simple health endpoint + job queue depth metric for demo.

---

## 10. Evolution Path

1. **MVP:** Modular monolith + SQLite + local Docker.
2. **Next:** Extract Sandbox Runner and LLM Gateway as separate processes if needed.
3. **Scale:** Move to Postgres, add Redis queue, introduce vector index, multi-user auth.
4. **Production:** Horizontal scaling of API, dedicated sandbox fleet, cost controls, SSO.

---

*Architecture decisions lean toward the detailed Claude specification. SQLite vs Postgres and exact graph library remain open for final team confirmation.*
