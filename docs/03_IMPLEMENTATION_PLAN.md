# Parikshit – Implementation Plan & Task Breakdown

**Version:** 2.0 (Synthesized Final)  
**Target:** Antigravity / AI coding agent or human engineering team  
**Timeline Assumption:** Intensive hackathon-style (days to 2–3 weeks)  

---

## Guiding Principles for Implementation

1. **Mentor first.** Nothing else matters until Module 1 works end-to-end on the demo repository.
2. **Vertical slices.** Prefer a thin end-to-end path over horizontal layers that cannot be demoed.
3. **Ledger everything.** Even early features should write ledger entries.
4. **Sandbox from day 1.** Even if only used for “echo” tests initially.
5. **Deterministic citations.** Citation verifier is non-negotiable before any Mentor Q&A is shown to users.
6. **Cut rule.** If time pressure appears, stop at the lowest incomplete priority in the Phase table.

---

## Sprint / Milestone Overview

| Sprint | Focus | Exit Criteria | Est. Effort |
|--------|-------|---------------|-------------|
| **Sprint 0** | Foundation & Repo Setup | Project skeleton, Docker, SQLite, basic API health | 1–2 days |
| **Sprint 1** | Codebase Mentor (MVP Core) | Ingest → Index → Overview → Cited Q&A → Tours on demo repo | 4–6 days |
| **Sprint 2** | Vibe Coding + QA Foundations | Workspace, plan, patch, diff, pytest runner, approval gate | 3–5 days |
| **Sprint 3** | Battle + Ledger + Self-Heal | Full AI vs AI Battle, complete ledger export, basic self-heal | 4–6 days |
| **Sprint 4** | Polish, Digital Twin, Demo | Graph view, impact prediction, demo playbook, hardening | 2–3 days |

---

## Sprint 0 – Foundation

**Goal:** Runnable skeleton that the rest of the team (or agent) can extend safely.

### Tasks
- [ ] Create monorepo structure (`/frontend`, `/backend`, `/sandbox`, `/docs`, `/scripts`)
- [ ] Backend: FastAPI app with health endpoint, structured error envelope, CORS, SSE helper
- [ ] Frontend: Next.js App Router + Tailwind + shadcn/ui + basic layout (sidebar + main)
- [ ] SQLite setup with WAL + migration runner (Alembic or raw SQL)
- [ ] Docker Compose (or simple Dockerfile) for sandbox base image
- [ ] LLM Gateway stub with OpenAI-compatible interface + cost counter
- [ ] Environment template (`.env.example`) and config loader
- [ ] Basic logging with correlation ID middleware
- [ ] CI skeleton (lint + type-check + unit test placeholder)

**Dependencies:** None  
**Deliverable:** `docker compose up` (or equivalent) starts API + frontend; health check returns 200.

---

## Sprint 1 – Codebase Mentor (P0)

**Goal:** Full Mentor experience on a single pre-validated demo repository.

### Tasks (ordered by dependency)

1. **Ingestion**
   - [ ] Accept Git HTTPS URL or ZIP upload
   - [ ] Clone / unpack to read-only project store
   - [ ] Record commit SHA, language stats, size limits
   - [ ] Emit job progress via SSE
   - [ ] Write `projects` + `revisions` + first ledger entry

2. **Indexing**
   - [ ] Walk file tree (respect .gitignore + size limits)
   - [ ] tree-sitter parsing for Python + JS/TS → symbols + imports
   - [ ] Chunking strategy (function-level preferred, fallback to fixed-size)
   - [ ] FTS5 index + symbol table + import_edges
   - [ ] Rank important files (entry points, routes, models, tests, config)

3. **Architecture Overview**
   - [ ] Retrieval of key symbols + import graph
   - [ ] LLM prompt that forces component + relationship structure
   - [ ] Citation extraction + server-side verification
   - [ ] Persist overview artifact

4. **Cited Q&A**
   - [ ] Hybrid retrieval (FTS + symbol proximity)
   - [ ] LLM answer with forced citation format
   - [ ] Citation Verifier (must pass before response is returned)
   - [ ] Uncertainty status (grounded / partially / unsupported)
   - [ ] Chat UI with citation highlighting and click-to-source

5. **Guided Tours**
   - [ ] Tour generation prompt (ordered steps with citations)
   - [ ] Tour player UI (step navigation + code highlight)

6. **Starter Tasks (P1)**
   - [ ] Heuristic + LLM suggestion of 3+ beginner tasks

**Exit Criteria:**  
User can paste a Git URL → watch indexing progress → see architecture overview → ask 5 questions with valid citations → complete a guided tour → see starter tasks. All actions appear in the ledger.

**Demo Repo Requirement:** One public Python or TS repository with clear structure, tests, and a few interesting flows must be chosen and validated before Sprint 1 ends.

---

## Sprint 2 – Vibe Coding Agent + QA Foundations

**Goal:** Natural-language request → plan → isolated workspace → patch → diff → checks → approval.

### Tasks

1. **Workspace Manager**
   - [ ] Create isolated checkout from a revision
   - [ ] Apply unified diff / patch safely
   - [ ] Compute and store diffs
   - [ ] Cleanup policy

2. **Plan → Build Flow**
   - [ ] Request storage
   - [ ] Plan generation (shown to user before code gen)
   - [ ] Builder agent with tool access limited to workspace
   - [ ] Diff viewer UI

3. **Sandbox Runner (pytest focus)**
   - [ ] Docker runner with no network, resource limits, non-root
   - [ ] Execute pytest (or simple command)
   - [ ] Capture stdout/stderr, exit code, artifacts
   - [ ] Store as `sandbox_runs` + `test_results`

4. **Approval Gate**
   - [ ] Explicit UI confirmation
   - [ ] Record approval in ledger
   - [ ] Export patch (download) or discard

5. **Basic QA Agent**
   - [ ] Discover existing tests
   - [ ] Generate additional tests (P1)
   - [ ] Structured bug report model

**Exit Criteria:**  
User can request a small feature/bugfix → see plan → approve → watch workspace changes → review diff → run tests in sandbox → approve export. Everything ledgered.

---

## Sprint 3 – AI vs AI Battle + Full Ledger + Self-Heal

**Goal:** Signature differentiator + complete evidence story.

### Tasks

1. **Agent Orchestrator**
   - [ ] Role system prompts (Builder, Adversarial QA, Reviewer, Healer)
   - [ ] Multi-turn state machine with round limits
   - [ ] Tool allow-lists per role

2. **Battle Loop**
   - [ ] Builder produces/uses patch
   - [ ] Adversarial QA generates challenges + new test cases
   - [ ] Challenges executed in sandbox
   - [ ] Reviewer produces battle report + residual risks
   - [ ] UI for battle timeline and report

3. **Proof-of-Work Ledger (complete)**
   - [ ] Hash-chained append-only table
   - [ ] Coverage of all event types
   - [ ] Export endpoint (JSON + human summary)
   - [ ] Ledger viewer UI

4. **Self-Healing Loop (P1)**
   - [ ] Capture & freeze baseline failure
   - [ ] Reproduce check
   - [ ] Diagnose → ranked hypotheses
   - [ ] Attempt loop (max 3 / time limit)
   - [ ] Verdict taxonomy
   - [ ] Safe revert of failed attempts

**Exit Criteria:**  
Full battle on a seeded change produces a report with at least one real challenge. Ledger export contains the complete chain. Self-heal can take a simple failing test to verified_fix or clear inconclusive.

---

## Sprint 4 – Polish, Digital Twin, Demo Readiness

### Tasks
- [ ] Import / dependency graph visualisation (React Flow)
- [ ] Impact prediction (before) vs actual diff (after)
- [ ] Demo playbook script + seeded repository
- [ ] Error boundary polish + empty states
- [ ] Security checklist verification (sandbox isolation, no network, citation integrity)
- [ ] Performance smoke test on demo repo
- [ ] Final README + environment setup instructions
- [ ] Optional: Playwright single journey for the demo app itself

**Exit Criteria:**  
A judge can follow the demo playbook and see Mentor → Vibe Coding → Battle → Ledger export without assistance. All security checklist items pass.

---

## Task Dependency Graph (Simplified)

```
Sprint 0 (Foundation)
    │
    ▼
Sprint 1 (Mentor) ──────────────────────────────────────┐
    │                                                   │
    ├── Ingestion → Indexing → Overview → Q&A → Tours   │
    │                                                   │
    ▼                                                   ▼
Sprint 2 (Vibe + QA) ─── Workspace + Sandbox ───────────┤
    │                                                   │
    ▼                                                   │
Sprint 3 (Battle + Ledger + Heal) ◄─────────────────────┘
    │
    ▼
Sprint 4 (Polish + Twin + Demo)
```

---

## Prioritized Deliverables for Antigravity

If the agent must choose what to implement first under extreme time pressure:

1. Project skeleton + SQLite + health endpoint
2. Ingestion (Git URL) + basic file listing
3. tree-sitter indexing for Python
4. Citation Verifier (hard requirement)
5. Mentor Q&A with verified citations
6. Architecture overview
7. Ledger (append + simple viewer)
8. Docker sandbox runner (even if only `pytest --collect-only`)
9. Workspace + diff
10. Battle loop (even single round)
11. Everything else

---

## Definition of Done (per feature)

- Code committed with tests (unit for pure logic, integration for API)
- Ledger entry written for the action
- Error cases return structured responses
- Citation paths (where applicable) are verified
- Documented in the relevant API / schema file
- Visible in the UI or via a clear API response

---

*This plan reconciles the Claude roadmap (more granular phases) with the Grok implementation roadmap. Phase cut rules and priority ordering follow the Claude PRD.*
