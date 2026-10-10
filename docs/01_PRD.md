# Parikshit – Product Requirements Document (PRD)

**Project:** Parikshit (Team Vishwam)  
**Version:** 2.0 (Synthesized Final – Developer Ready)  
**Date:** 10 October 2026  
**Status:** Ready for implementation by Antigravity  
**Audience:** Engineering team, AI coding agents, mentors, judges  

**Tagline:** An AI engineering teammate that moves developers from unfamiliar code to verified changes: **understand → change → challenge → verify → prove**.

---

## 1. Executive Summary & Project Vision

Parikshit is an AI-powered software engineering platform that acts as a rigorous engineering teammate rather than a simple code generator. It helps developers rapidly understand unfamiliar codebases, propose and implement changes in isolated workspaces, adversarially challenge those changes, automatically test and attempt repairs, and produce cryptographically verifiable evidence of what actually happened.

### Core Philosophy
> AI should not merely generate code. It should understand the code, challenge its assumptions, test its work, and provide evidence of what actually happened.

### Differentiating Pillars
1. **Grounded Retrieval + Citation Verification** – Every claim about code is backed by verified path + line-range citations that are server-side validated before display.
2. **Isolated Execution & Human Gates** – All code changes and test runs happen inside Docker sandboxes. No merge or export occurs without explicit user approval.
3. **AI vs AI Battle (Signature Feature)** – Multi-agent loop (Builder → Adversarial QA → Reviewer) that produces a battle report with remaining risks.
4. **Proof-of-Work Ledger** – Hash-chained, immutable record of every significant action, decision, and evidence artifact.
5. **Self-Healing Loop** – Autonomous diagnose → patch → verify cycle with clear verdict taxonomy.

### Anti-Goals (What We Explicitly Refuse)
- Pure “vibe coding” without verification or evidence.
- Silent merges or overwriting of user repositories.
- Claiming universal language / framework support in v1.
- Black-box “AI fixed it” without showing diffs, tests, and citations.
- Multi-tenant production SaaS features in MVP (single-user / demo mode is sufficient).

---

## 2. Target User Personas & Core Use Cases

### Primary Personas

| Persona | Description | Primary Pain | Success Moment |
|---------|-------------|--------------|----------------|
| **New Joiner / Intern** | Developer onboarding to a large unfamiliar repo | “Where do I even start?” | Architecture overview + guided tour + starter tasks in < 15 min |
| **Feature Owner** | Mid-level engineer tasked with a change in a complex area | Fear of breaking unknown dependencies | Plan + isolated patch + battle report + verified tests |
| **Tech Lead / Reviewer** | Needs confidence before merging AI-assisted work | Lack of evidence and residual risk visibility | Ledger entry + battle report + impact prediction vs actual |
| **Hackathon / Demo Audience** | Judges and mentors evaluating the system | Need for clear, impressive, reproducible demo | End-to-end Mentor → Battle → Ledger flow on a seeded repo |

### Core Use Cases (End-to-End)

1. **Onboard to a new repository**  
   Ingest public Git URL or ZIP → index → architecture overview → ask questions with citations → take guided tour → receive starter tasks.

2. **Implement a feature or bug fix (“Vibe Coding”)**  
   Natural-language request → plan → isolated workspace → apply changes → show diff → run checks → request approval → export patch.

3. **Challenge the change (AI vs AI Battle)**  
   Builder produces patch → Adversarial QA generates failing scenarios / edge cases → Reviewer synthesizes verdict and remaining risks → battle report stored in ledger.

4. **Self-heal a failing test**  
   Observe failure → diagnose (ranked hypotheses + citations) → propose patch → re-run in sandbox → produce verified_fix / attempted_fix / inconclusive verdict.

5. **Prove the work**  
   Every significant step writes an immutable ledger entry. User can export a complete evidence pack (diffs, test outputs, agent transcripts, hashes).

---

## 3. Detailed Feature Breakdown

### 3.1 Functional Requirements (by Module)

#### Module 1: Codebase Mentor (Phase 1 – P0)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-M-01 | Ingest public Git HTTPS URL or ZIP/TAR archive | P0 | Repo cloned/unpacked to read-only storage; commit SHA recorded; size & file-count limits enforced with clear errors |
| FR-M-02 | Index files into chunks, symbols, and import edges (Python + JS/TS) | P0 | Symbol table lists functions, classes, routes; unsupported files indexed as plain text |
| FR-M-03 | Rank important files (entry points, routes, models, config, tests) | P0 | Top-N list with reason per file derived from static signals |
| FR-M-04 | Generate architecture overview with components & relationships | P0 | Each component lists files; each relationship has ≥1 cited import/call/route |
| FR-M-05 | Answer NL questions with citations | P0 | Every code claim has citation object (path, start_line, end_line, commit) |
| FR-M-06 | Verify citations server-side before display | P0 | Invalid citations stripped or answer regenerated once; user never sees unverifiable citation |
| FR-M-07 | State uncertainty when evidence missing | P0 | Status ∈ {grounded, partially_grounded, unsupported} |
| FR-M-08 | Guided tours of key flows | P0 | Ordered steps, each with cited code range + explanation |
| FR-M-09 | Suggest beginner-friendly starter tasks | P1 | ≥3 tasks with rationale, files to read, risk level |

#### Module 2: Vibe Coding Agent (Phase 2 – P0)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-C-01 | Accept natural-language feature/bug-fix request | P0 | Request stored and linked to project revision |
| FR-C-02 | Inspect relevant code & identify affected files/dependencies | P0 | Uses index + symbol graph |
| FR-C-03 | Propose clear implementation plan | P0 | Plan shown to user before any code generation |
| FR-C-04 | Generate & apply changes in isolated workspace | P0 | Workspace is a separate checkout; original repo untouched |
| FR-C-05 | Display reviewable code diff | P0 | Unified diff + per-file view |
| FR-C-06 | Run appropriate checks before presenting result | P0 | At minimum lint + existing tests if present |
| FR-C-07 | Never silently overwrite original project | P0 | All writes confined to workspace |
| FR-C-08 | Explicit user approval before merge/export | P0 | Approval gate required; recorded in ledger |

#### Module 3: Autonomous AI QA Engineer (Phase 2 – P0)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-Q-01 | Inspect application and existing tests | P0 | Discovers pytest (Python) or equivalent |
| FR-Q-02 | Generate relevant test cases | P1 | New tests written to workspace |
| FR-Q-03 | Execute unit/integration tests in sandbox | P0 | pytest runner; structured results |
| FR-Q-04 | Capture logs, stdout/stderr, exit codes | P0 | All artifacts stored and linked |
| FR-Q-05 | Produce structured bug reports | P0 | Severity, steps, expected vs actual, evidence links |

#### Module 4: AI vs AI Battle (Phase 3 – P0 Signature)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-B-01 | Three distinct roles: Builder, Adversarial QA, Reviewer | P0 | Roles may share model initially but different system prompts |
| FR-B-02 | Adversarial agent must challenge (not auto-agree) | P0 | At least one concrete challenge or edge case per battle |
| FR-B-03 | Multi-round exchange (default 2 rounds) | P0 | Configurable; each round recorded |
| FR-B-04 | Produce battle report with remaining risks | P0 | Report includes what changed, what was challenged, test results, residual risks |
| FR-B-05 | All findings and decisions written to ledger | P0 | Immutable entries |

#### Module 5: Self-Healing Loop (Phase 3 – P1)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-H-01 | Preserve original failure evidence | P0 | Baseline run immutable and linked |
| FR-H-02 | Reproduce before repair | P0 | Failure must reproduce at least once, else inconclusive |
| FR-H-03 | Diagnose then patch | P1 | Ranked hypotheses with cited code before patch |
| FR-H-04 | Verify by re-running failing test + regression set | P0 | Uses runner output only |
| FR-H-05 | Attempt & time limits | P0 | Default 3 attempts / 10 min total (configurable) |
| FR-H-06 | Safe discard of failed attempts | P0 | Failed attempts revert; diff retained for audit |
| FR-H-07 | Verdict taxonomy | P0 | verified_fix \| attempted_fix \| unverified \| failed \| inconclusive |
| FR-H-08 | Approval before merge/export | P0 | Same gate as FR-C-08 |

#### Module 6: Software Digital Twin (Phase 3 – P1)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-T-01 | Build module/file dependency graph | P1 | Nodes = files/modules; edges = imports + route-to-handler |
| FR-T-02 | Interactive visualisation | P1 | Zoom, search, click-through to source |
| FR-T-03 | Impact prediction vs actual | P1 | Before change: predicted affected files; after: actual diff comparison |

#### Module 7: Proof-of-Work Ledger (Phase 3 – P0)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-L-01 | Hash-chained immutable entries | P0 | Each entry contains previous hash + content hash |
| FR-L-02 | Record every significant action | P0 | Ingest, plan, patch, test run, battle round, approval, export |
| FR-L-03 | Exportable evidence report | P0 | JSON + human-readable summary with all linked artifacts |

### 3.2 Non-Functional Requirements

| ID | Category | Requirement | Target |
|----|----------|-------------|--------|
| NFR-01 | Performance | Mentor Q&A response (first token) | < 3 s on warm index |
| NFR-02 | Performance | Full architecture overview generation | < 60 s for ≤ 100k LOC |
| NFR-03 | Reliability | Sandbox isolation | No network, resource-capped, non-root |
| NFR-04 | Security | Citation integrity | 100% of displayed citations server-verified |
| NFR-05 | Security | No secrets in LLM context | Redaction + allow-list tools |
| NFR-06 | Observability | Structured logging of all agent steps | JSON logs + correlation IDs |
| NFR-07 | Cost | LLM budget guard | Per-session and global hard caps |
| NFR-08 | Usability | Single-user / local-demo mode | No mandatory accounts in MVP |
| NFR-09 | Extensibility | LLM provider abstraction | OpenAI-compatible + Anthropic adapters |

---

## 4. Scope: Phase 1 (MVP) vs Future Phases

### Phase 1 – MVP / Hackathon Demo (Must Work End-to-End)
- Module 1: Codebase Mentor (full)
- Ingestion + indexing for Python + JS/TS
- Architecture overview + cited Q&A + guided tours
- Proof-of-Work Ledger (basic recording of Mentor actions)
- One pre-validated demo repository with seeded content
- Docker sandbox for any future test runs
- Single-user local mode

**Cut Rule:** If time is short, Module 1 + Ledger path on the demo repository must work before anything else.

### Phase 2
- Module 2: Vibe Coding Agent (plan → workspace → diff → checks → approval)
- Module 3: Autonomous AI QA (pytest focus)
- Isolated workspace lifecycle
- Basic battle scaffolding (can be single-round)

### Phase 3
- Full AI vs AI Battle (2+ rounds)
- Self-Healing Loop
- Software Digital Twin (import graph + impact)
- Complete Ledger export

### Phase 4+ (Post-MVP)
- Playwright / browser E2E
- Embedding-based retrieval (if keyword+symbol underperforms)
- Multi-language expansion
- Multi-user / auth
- Postgres + vector store
- CI integration

### Explicitly Out of Scope for MVP
- Private repository authentication beyond simple token (public Git + ZIP only)
- Full multi-tenant SaaS
- Automatic merging to user branches
- Support for every language / build system
- Real-time collaborative editing

---

## 5. Success Metrics (Hackathon / Demo)

| Metric | Target |
|--------|--------|
| Time to first useful architecture overview | < 2 min after ingest |
| Citation accuracy (manual sample) | ≥ 95% of displayed citations valid |
| End-to-end Mentor → Battle → Ledger demo | Completes without crash on seeded repo |
| User can export evidence pack | Single button → downloadable artifact |
| Sandbox never escapes or contacts network | Verified by security checklist |

---

## 6. Assumptions & Open Questions (Flagged for Review)

**Assumptions (industry-standard decisions made):**
- A1: Initial supported stack = Python + JavaScript/TypeScript.
- A2: QA / Battle / Self-Healing initially target pytest-based Python backends.
- A3: Hosted LLM API with structured output + tool calling is available.
- A4: Docker is available on the demo machine.
- A5: Repositories ≤ ~100k LOC / 2,000 files are in scope.
- A6: Single-user / no accounts for MVP is acceptable.
- A7: SQLite (WAL + FTS5) is sufficient for MVP; Postgres later.

**Open Questions (need team confirmation):**
1. Exact demo repository and seeded bug/feature.
2. Preferred LLM provider + model tier per agent role + budget cap.
3. Demo environment: single laptop with Docker vs cloud VM.
4. Whether any authentication is required even for local demo.
5. Preferred graph visualisation library (React Flow vs Cytoscape vs custom).

---

## 7. Glossary

| Term | Meaning |
|------|---------|
| Grounded | Answer fully backed by verified citations |
| Citation | Object {path, start_line, end_line, commit, snippet_hash} |
| Workspace | Isolated checkout where changes are applied |
| Battle | Multi-round Builder ↔ Adversarial QA exchange judged by Reviewer |
| Ledger | Hash-chained immutable proof-of-work log |
| Sandbox | Docker container with no network, resource limits, non-root |
| Verdict | verified_fix \| attempted_fix \| unverified \| failed \| inconclusive |

---

*Document synthesized from Claude & Grok source sets. Conflicts resolved toward the more detailed Claude specification with modern industry defaults. All requirement IDs are stable and referenced by Architecture, API, Schema, and Implementation Plan documents.*
