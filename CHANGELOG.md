# Changelog

All notable changes to the Parikshit platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-10-11

### Security & Hardening (Phase 1)
- **Command Allowlist**: Removed arbitrary user shell execution on `/tasks/{task_id}/run-checks`. Implemented strict allowlist of check profiles (`pytest`, `pytest_coverage`), rejecting all other commands with standard HTTP 400 error envelopes.
- **Docker Sandbox Hardening**:
  - Enforced non-root user execution (`--user 1000:1000`), read-only root filesystems (`--read-only`), temporary writable tmpfs (`/tmp`), dropping all capabilities (`--cap-drop ALL`), `no-new-privileges`, and PID limits.
  - Read resource limits (`SANDBOX_MEMORY_LIMIT`, `SANDBOX_CPU_LIMIT`, `SANDBOX_NETWORK`) dynamically from `Settings`.
  - Prohibited silent fallback to host execution when `SANDBOX_ENABLED=true`. Host execution strictly requires `SANDBOX_ENABLED=false` and `PARIKSHIT_ENV=development`.
- **Repository Ingestion Controls**:
  - Enforced `ALLOWED_GIT_HOSTS` on git clone URLs (HTTPS only; rejected `-`, `file://`, `ssh://`, `ext::`).
  - Restricted local ingestion to explicit `PARIKSHIT_LOCAL_SOURCE_ROOTS` allowlist.
  - Safe ZIP extraction defending against path traversal (Zip Slip) and symlink bypasses.
  - Secret redaction for high-entropy tokens, AWS keys, and private certificates in retrieved context.
- **Authentication & Authorization**:
  - Implemented `AuthMiddleware` checking `X-API-Key` when `AUTH_DISABLED=false`.
  - CORS allowlist reading from `CORS_ALLOWED_ORIGINS` (default `http://localhost:3000`).
  - Added comprehensive `SECURITY.md` covering threat models, sandbox limits, and vulnerability disclosures.

### Cryptographic Ledger Correctness (Phase 2)
- **Atomic Hash Chaining**: Wrapped `append_entry` in `BEGIN IMMEDIATE` transactions and added partial unique indexes `UNIQUE(project_id, sequence)` to guarantee no sequence forks under high concurrency.
- **Database Engine Immutability**: Added SQLite database triggers (`trg_ledger_entries_no_update`, `trg_ledger_entries_no_delete`) preventing `UPDATE` and `DELETE` queries at the database engine level.
- **Cross-Chain Verification & CLI**:
  - Updated `GET /api/v1/ledger/verify` to verify both project-specific chains and global chain.
  - Added standalone CLI tool `scripts/verify_ledger.py` returning exit code 0/1.
  - Added Evidence Pack JSON export with chain head hash, verification result, and entry payloads.
  - Added tamper-detection unit test verifying that arbitrary row tampering is detected with exact sequence reporting.

### Agent Generalization & Verification Pillars (Phases 3 & 4)
- **Generalization Beyond Demo**: Removed hardcoded calculator assumptions from `task_service`, `self_healing_service`, `battle_service`, and `twin_service`. Dynamic source resolution derives target files directly from repo AST.
- **LLM Gateway & Adapters**:
  - Implemented Anthropic Messages API adapter with exponential backoff retries.
  - Supported OpenAI and OpenAI-compatible base URLs (Ollama / vLLM / local inference).
  - Explicit mock provider mode (`LLM_PROVIDER=mock`) with `"mode": "mock"` flags in responses and ledger entries.
  - Enforced token and daily dollar budgets in `llm_usage` tracking table.
  - Externalized agent role prompts into `backend/app/agents/prompts/` (`safety.txt`, `builder.txt`, `adversary.txt`, `reviewer.txt`, `mentor.txt`, `healer.txt`).
  - Created Pydantic response models in `backend/app/models/schemas.py`.
- **Commit SHA Grounded Citations**: Validated commit SHA against revision, clamped integer line numbers, capped snippet size, and flagged ungrounded claims.
- **Human Approval Gate**: Strictly blocked patch export (`POST /tasks/{task_id}/export`) with HTTP 403 until human approval is logged for the exact patch hash.

### Frontend Cockpit Overhaul (Phase 5)
- **Modular Component Architecture**: Deconstructed 1,500-line monolithic `page.tsx` into 12 focused components in `frontend/src/components/` and shared typed modules in `frontend/src/lib/`.
- **System Telemetry & Badges**: Added `Banner.tsx` with "DEMO / MOCK MODE" banner, unsandboxed host badge, and dynamic error toasts with correlation IDs.
- **Signature Feature Views**:
  - Side-by-side AI vs AI Battle arena (`BattleReport.tsx`).
  - Color-coded unified patch diff viewer (`DiffViewer.tsx`).
  - Real-time ledger audit timeline with green/red chain verification badge and Evidence Pack download (`LedgerTimeline.tsx`).
  - AST Grounded citation drawer with line ranges and SHA-256 hashes (`CitationViewer.tsx`).
- **Asset Cleanup & Test Setup**: Removed default Next.js boilerplate SVGs, deduplicated logo assets, and established Vitest test suite (`frontend/vitest.config.ts`, 5 unit tests).

### Infrastructure, Tooling & DX (Phases 0, 6, 7 & 8)
- **Python Compatibility**: Fixed `Tuple` type annotations for Python 3.11 and 3.12 compatibility.
- **Versioned Migration Runner**: Created `backend/migrations/001_initial_schema.sql` and SQLite `schema_migrations` runner in `database.py`.
- **Centralized Database Connection**: Centralized DB connection context manager (`get_connection`) enforcing WAL mode, foreign keys, and busy timeout.
- **Dependency Split & Project Metadata**:
  - Created `backend/pyproject.toml` with ruff, mypy, and pytest configs.
  - Split runtime dependencies in `requirements.txt` and developer tools in `requirements-dev.txt`.
- **Docker Compose & Healthchecks**: Updated `docker-compose.yml` to remove obsolete `version` key, added container healthchecks, set `PARIKSHIT_DATA_DIR=/data`, and configured multi-stage frontend build.
- **Second Demo Repository**: Added `data/demo/task_queue` PriorityQueue demo repo in `scripts/seed_demo_repo.py`.
- **GitHub Workflows & Automation**:
  - Added `.github/workflows/ci.yml` matrix testing Python 3.11, 3.12, Node.js 20, and Docker builds.
  - Added `.github/dependabot.yml` and `.pre-commit-config.yaml`.
  - Created `Makefile`, `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates, and `scripts/record_demo.md`.
- **Test Suite & Coverage**: 25 isolated tests passing with 75% coverage across the backend engine.

---

## [2.0.0] - 2026-10-10

- Initial prototype release of Parikshit modular monolith.
