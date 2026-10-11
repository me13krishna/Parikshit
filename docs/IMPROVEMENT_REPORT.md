# Parikshit – Engineering & Security Improvement Report

**Date:** 11 October 2026  
**Auditor:** Senior Full-Stack Engineer & Security Reviewer  
**Repository:** [https://github.com/me13krishna/Parikshit](https://github.com/me13krishna/Parikshit)  
**Status:** All Verification Checks Passing (13/13 Pytest, 0 ESLint errors/warnings, Production Next.js Turbopack build clean)

---

## 1. Executive Summary

Parikshit is designed as an AI Engineering Teammate operating across five pillars: grounded citations, isolated execution with human gates, AI-vs-AI battle arena, hash-chained proof-of-work ledger, and an autonomous self-healing loop.

This audit addressed and resolved all concrete defects identified across the codebase, closed the operational and security gaps between documentation claims (`README.md`, `docs/02_SYSTEM_ARCHITECTURE.md`, `docs/06_SECURITY_ERROR_LOGGING.md`, `docs/07_API_CONTRACTS_SUMMARY.md`) and implementation, hardened the sandbox execution perimeter, and eliminated all frontend lint and compilation issues.

---

## 2. Defects Diagnosed & Remediated

### 2.1 Backend Type Annotation Defect (`NameError`)
- **Diagnosis:** In `backend/app/services/sandbox_service.py` (`_execute_in_environment -> Tuple[...]`) and `backend/app/services/indexer_service.py` (`_classify_file -> Tuple[...]`), `Tuple` was used in return type hints without being imported from the `typing` module. In standard Python environments or under static type introspection, this triggered a fatal `NameError: name 'Tuple' is not defined`.
- **Fix:** Added `Tuple` to `from typing import ...` in both service modules.

### 2.2 Broken Docker Deployment for Frontend
- **Diagnosis:** `docker-compose.yml` configured a `web` service building from `./frontend/Dockerfile`, but the file did not exist in the repository. Running `docker-compose build` or `docker compose up` resulted in build failures.
- **Fix:** Created a production multi-stage `frontend/Dockerfile` using `node:20-alpine` with standalone non-root execution (`USER nextjs`), plus a `.dockerignore` file excluding `node_modules`, `.next`, and `.git`.

### 2.3 Frontend ESLint and React 19 Compilation Errors
- **Diagnosis:** Running `npm run lint` in `frontend/` failed with **16 errors and 10 warnings** across `frontend/src/app/page.tsx`:
  - 8 unused icon imports (`ShieldCheck`, `Cpu`, `Search`, `RotateCcw`, `ArrowRight`, `Database`, `Lock`, `FileText`).
  - Function declaration hoisting violations in `useEffect` triggering React compiler `react-hooks/set-state-in-effect` and `react-hooks/immutability` errors.
  - Excessive use of raw `any` types on plan steps, test outcomes, battle rounds, and digital twin nodes.
  - Raw unescaped quotes in JSX text (`"` instead of `&quot;`).
  - Deprecated unoptimized `<img>` tags violating Next.js LCP best practices.
- **Fix:**
  - Removed unused imports and replaced `<img>` with Next.js `<Image />` with fixed dimensions and `priority`.
  - Refactored data-fetching functions into `useCallback` hooks declared before the mount effect.
  - Implemented strong TypeScript interfaces: `PlanStep`, `TaskPlan`, `TaskItem`, `TestOutcome`, `SandboxRunResult`, `BattleRound`, `BattleReport`, `HealResult`, `TwinNode`, `TwinEdge`, `TwinGraphData`, and `ImpactComparisonData`.
  - Result: `npm run lint` and `npm run build` now pass with **0 errors and 0 warnings**.

### 2.4 Sandbox Execution Security Hardening
- **Diagnosis:** `docs/06_SECURITY_ERROR_LOGGING.md` specifies that sandbox containers must run as a non-privileged user. The Docker execution command in `sandbox_service.py` was missing the `--user` flag.
- **Fix:** Added `--user 1000:1000` to the Docker execution arguments, ensuring all container processes run under unprivileged user permissions alongside `--network none`, `--memory 512m`, and `--cpus 1.0`.

---

## 3. Gap Closure: README & Architecture Claims vs Code

| Specification Claim | Status Before Audit | Action Taken |
| :--- | :--- | :--- |
| **Safe ZIP Ingestion** (`docs/06_SECURITY_ERROR_LOGGING.md`, `07_API_CONTRACTS_SUMMARY.md`) | Raised `UNSUPPORTED_FORMAT` error for ZIP files. | Implemented safe `.zip` extraction in `IngestionService._copy_local` with active Zip Slip / path traversal rejection (`PATH_TRAVERSAL_DETECTED`). |
| **Credential & Secret Redaction** (`docs/06_SECURITY_ERROR_LOGGING.md`) | Chunks were retrieved and exposed without token redaction. | Implemented regex-based `RetrievalService.redact_secrets` filtering AWS keys, API tokens, bearer headers, and private keys before returning context. |
| **Complete REST Contracts** (`docs/07_API_CONTRACTS_SUMMARY.md`) | Missing 14 endpoints including jobs, runs, starter-tasks, symbols, and project-scoped ledger exports. | Implemented all missing routes across `projects.py`, `mentor.py`, `tasks.py`, `battles.py`, `ledger.py`, `jobs.py`, and `health.py`, adhering strictly to the `{ ok, data, error }` contract envelope. |

---

## 4. Verification Evidence

### 4.1 Backend Pytest Test Suite
Executed: `cd backend && python -m pytest -q`
```
.............                                                            [100%]
13 passed in 7.64s
```
Test breakdown:
1. `tests/test_foundation.py`: 4 passed (health, database, genesis ledger, chain verification)
2. `tests/test_mentor.py`: 1 passed (ingest -> index -> retrieval -> architecture overview -> cited Q&A -> guided tours)
3. `tests/test_vibe_and_sandbox.py`: 1 passed (plan -> workspace -> patch -> sandbox pytest -> human gate -> ledger)
4. `tests/test_battle_and_heal.py`: 1 passed (AI vs AI battle rounds -> sandbox challenge -> self-healing loop -> cryptographic ledger)
5. `tests/test_digital_twin.py`: 1 passed (dependency graph -> impact prediction -> precision/recall metrics)
6. `tests/test_security_and_fixes.py` *(New)*: 4 passed (type annotations, secret redaction, safe zip extraction, Zip Slip traversal rejection)
7. `tests/test_api_contracts.py` *(New)*: 1 passed (full contract verification across all endpoint groups)

### 4.2 Frontend Lint and Build Verification
Executed: `cd frontend && npm run lint`
```
> frontend@0.1.0 lint
> eslint
(exited with code 0 - 0 errors, 0 warnings)
```

Executed: `cd frontend && npm run build`
```
▲ Next.js 16.4.0 (Turbopack)
✓ Compiled successfully in 633ms
  Running TypeScript ...
  Finished TypeScript in 2.5s ...
✓ Generating static pages using 5 workers (4/4) in 850ms
Route (app)
┌ ○ /
└ ○ /_not-found
(exited with code 0)
```

---

## 5. Deliberately Left Undone (With Rationale)

1. **Database Backend Migration (SQLite $\rightarrow$ PostgreSQL)**:
   - *Rationale:* Per `docs/02_SYSTEM_ARCHITECTURE.md`, SQLite in WAL mode with FTS5 is the specified zero-ops architectural driver for local and demo execution. Migrating to external PostgreSQL was not requested and would break single-command local setup.
2. **Public API Contract Envelope Alterations**:
   - *Rationale:* Maintained strict backwards compatibility with `{ ok: bool, data: ..., error: { code, message, details, correlation_id } }`. No public breaking changes were introduced.
3. **External Real LLM Calling Requirement for Tests**:
   - *Rationale:* Tests utilize deterministic mock gateways to guarantee reproducible, offline-capable test runs that never require real API keys or incur monetary charges during CI/testing.
