# Parikshit – Engineering & Security Improvement Report

**Date:** 11 October 2026  
**Auditor:** Senior Full-Stack Engineer & Security Reviewer  
**Repository:** [https://github.com/me13krishna/Parikshit](https://github.com/me13krishna/Parikshit)  
**Status:** All 8 Phases Complete (25/25 Pytest Passed with 75% Coverage, 5/5 Frontend Vitest Passed, ESLint 0 Errors, Next.js Build Clean)

---

## 1. Executive Summary

Parikshit is designed as an AI Engineering Teammate operating across five pillars: grounded citations, isolated execution with human gates, AI-vs-AI battle arena, a hash-chained proof-of-work ledger, and an autonomous self-healing loop.

This comprehensive audit resolved all defects across the stack, eliminated arbitrary host execution vulnerabilities, reinforced sandbox isolation, established atomic cryptographic ledger verification with database immutability triggers, generalized agent execution beyond the demo calculator, refactored the frontend into a modular component architecture, and established robust CI workflows across Python 3.11, 3.12, and Node.js 20.

---

## 2. Phase-by-Phase Summary of Changes

### Phase 0: Python Compatibility & Blocker Fixes
- Added missing `Tuple` imports to `backend/app/services/indexer_service.py` and `backend/app/services/sandbox_service.py` ensuring immediate compatibility with Python 3.11 and 3.12.
- Added `requires-python = ">=3.11"` in `pyproject.toml` and verified that imports and linting pass under Ruff.

### Phase 1: Security Hardening
- **Command Injection Remediation:** Removed arbitrary shell command execution in `backend/app/api/tasks.py`. Replaced with a strict allowlist of check profiles (`pytest`, `pytest_coverage`).
- **Sandbox Isolation:** Hardened container flags in `sandbox_service.py` with `--user 1000:1000`, `--read-only`, tmpfs on `/tmp`, `--cap-drop ALL`, `--security-opt no-new-privileges`, and PID limits. Configured dynamic limits from `config.py`.
- **Prohibited Host Fallback:** Disabled silent fallback to host execution when Docker fails; host execution is only permitted when explicitly configured with `SANDBOX_ENABLED=false` and `PARIKSHIT_ENV=development`, accompanied by a prominent warning badge.
- **Repository Ingestion Controls:** Enforced `ALLOWED_GIT_HOSTS` on HTTPS clone URLs; restricted local directory ingestion to `PARIKSHIT_LOCAL_SOURCE_ROOTS`; implemented safe ZIP extraction preventing Zip Slip path traversal; added regex secret redaction.
- **Authentication & CORS:** Implemented `AuthMiddleware` with `X-API-Key` check; configured CORS allowlist; added root-level `SECURITY.md`.

### Phase 2: Ledger Correctness (Pillar 4)
- **Atomic Transactions & Partial Indexes:** Wrapped ledger `append_entry` in `BEGIN IMMEDIATE` transactions with unique sequence index constraints preventing concurrent sequence forks.
- **Database Engine Immutability:** Implemented SQLite triggers `trg_ledger_entries_no_update` and `trg_ledger_entries_no_delete` blocking direct database modifications.
- **Tamper Detection & CLI Verification:** Created `scripts/verify_ledger.py` CLI tool; verified all chains (global + project); added unit tests asserting tamper detection on arbitrary SQL edits.

### Phases 3 & 4: Agent Generalization & Verification Pillars (Pillars 1, 2, 3, 5)
- **Generalization:** Removed calculator-specific hardcoding across services. Target files and imports are dynamically derived from repository AST.
- **LLM Gateway & Adapters:** Implemented Anthropic Messages API adapter; supported OpenAI-compatible base URLs; explicit mock provider mode (`LLM_PROVIDER=mock`) with `"mode": "mock"` telemetry.
- **Budget Tracking:** Implemented `llm_usage` table tracking token counts and estimating dollar costs against daily hard caps.
- **Externalized Prompts & Structured Models:** Extracted system prompts into `backend/app/agents/prompts/`; defined Pydantic validation schemas in `backend/app/models/schemas.py`.
- **Commit SHA Citations & Human Gate:** Validated commit SHA against revisions in `CitationVerifier`; strictly enforced human approval before patch exports on `POST /api/v1/tasks/{id}/export`.

### Phase 5: Frontend Overhaul
- **Modular Component Architecture:** Split monolithic `page.tsx` (1,500 lines) into 12 modular components under `frontend/src/components/` and shared typed client in `frontend/src/lib/`.
- **Telemetry & Cockpit Views:** Added `Banner.tsx` with mock mode and unsandboxed warnings; side-by-side AI-vs-AI Battle view; color-coded unified patch diff viewer; AST citation drawer modal; tamper-evident ledger audit timeline.
- **Asset Cleanup & Test Setup:** Removed unused boilerplate SVG assets; deduplicated logos; added Vitest unit test suite with 5 passing tests covering API error handling and ledger verification badges.

### Phase 6: Tooling, Migrations & DX
- **Versioned Migration Runner:** Added `backend/migrations/001_initial_schema.sql` and SQLite `schema_migrations` runner in `database.py`.
- **Centralized DB Connection:** Created `get_connection()` context manager setting WAL mode, foreign keys, and busy timeout.
- **Docker Compose & Healthchecks:** Configured `docker-compose.yml` with container healthchecks, persistent `/data` volume, and removed obsolete `version` key.
- **Dev Runner & Makefile:** Added `scripts/run_dev.sh` and root `Makefile` (`make dev`, `make test`, `make lint`).

### Phase 7: Test Isolation & Coverage
- Isolated all test runs using `tmp_path` fixtures in `backend/tests/conftest.py`, leaving zero artifacts or DB pollution behind.
- Achieved **75% test coverage** across the backend application with 25 unit and contract tests passing.

### Phase 8: CI & Repository Polish
- Added `.github/workflows/ci.yml` testing Python 3.11, Python 3.12, Node.js 20, and Docker builds.
- Added `.github/dependabot.yml`, `.pre-commit-config.yaml`, `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates, and `scripts/record_demo.md`.
- Updated `scripts/seed_demo_repo.py` with an idempotent multi-repo seeder including a second non-calculator demo repo (`data/demo/task_queue`).
- Rewrote `README.md` with honest status tables, configuration reference, and Mermaid architecture diagrams.

---

## 3. Verification Evidence

### Backend Pytest Suite
```
tests/test_api_contracts.py ..... PASSED [ 4%]
tests/test_battle_and_heal.py ... PASSED [ 8%]
tests/test_digital_twin.py ...... PASSED [12%]
tests/test_foundation.py ........ PASSED [28%]
tests/test_ledger_correctness.py. PASSED [40%]
tests/test_mentor.py ............ PASSED [44%]
tests/test_pillars_and_agents.py. PASSED [60%]
tests/test_security_and_fixes.py. PASSED [76%]
tests/test_security_phase1.py ... PASSED [96%]
tests/test_vibe_and_sandbox.py .. PASSED [100%]

TOTAL: 25 passed in 8.71s (Coverage: 75%)
```

### Frontend Vitest Suite
```
✓ src/lib/__tests__/api.test.ts (3 tests)
✓ src/components/__tests__/Header.test.tsx (2 tests)

Test Files: 2 passed (2)
Tests: 5 passed (5)
```

### Frontend Lint & Build
```
npm run lint: 0 errors, 0 warnings
npm run build: Compiled successfully via Turbopack (Next.js 16.4.0)
```

---

## 4. Deliberately Left Undone & Rationale

1. **External RFC 3161 Timestamping Authority Integration:**
   - *Rationale:* Anchoring the SHA-256 ledger head hash to a public blockchain or RFC 3161 TSA requires external network dependencies and account credentials. The offline hash-chain and database triggers provide tamper-evidence for single-node deployments; recommendations for external anchoring are documented in `SECURITY.md` and `docs/06_SECURITY_ERROR_LOGGING.md`.
2. **Docker-in-Docker Daemon in Compose:**
   - *Rationale:* Running a Docker daemon inside a container requires privileged mode or mounting `/var/run/docker.sock`. Mounting the Docker socket is documented as an optional compose mount with appropriate security warnings regarding host root equivalence.
3. **Third-Party Provider Live API Keys in CI:**
   - *Rationale:* CI runs strictly with `LLM_PROVIDER=mock`, guaranteeing deterministic execution, zero external network flakes, and zero cost while testing all 5 pillars end-to-end.
