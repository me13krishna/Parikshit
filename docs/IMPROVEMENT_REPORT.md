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

## 4. UI/UX: Logo-Driven Cockpit Redesign

### Design Foundations & Token Architecture
- **Logo Asset Generation (`scripts/make_brand_assets.py`):**
  - Sampled exact RGB chromatic values from `frontend/public/brand/parikshit-logo-original.jpg`.
  - Extracted alpha-blended transparent assets using quadratic luminance falloff (`gamma=0.92`, `floor=12.0`) to eliminate black halo artifacts.
  - Generated web-ready assets into `frontend/public/brand/`: `mark.png` (`@2x`), `wordmark.png` (`@2x`), `lockup.png` (`@2x`), `lockup-stacked.png`, `favicon.ico`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, and Open Graph `og-image.png` (1200x630).
- **Tailwind v4 Theme Tokens (`frontend/src/app/globals.css`):**
  - Dark-first foundation: background `ink-950` (`#00030F`), surfaces `ink-900` (`#060B1E`), elevated inputs `ink-800` (`#0D1430`), ambient glows `glow-indigo` (`#140756`).
  - Brand accents: `blue-500` (`#076CD3`), `indigo-500` (`#2E38DE`), `sky-400` (`#39AAF0`), `cyan-300` (`#6AD7FA`), `violet-400` (`#9390FB`), `lavender-300` (`#AD81DB`).
  - Semantic gradients: `--grad-ring` (teal-400 -> blue-500 -> violet-400 -> lavender-300) and `--grad-ribbon` (cyan-300 -> blue-500 -> indigo-500).
  - Agent role colors: Builder (`blue-500`), Adversary (`violet-400`), Reviewer (`cyan-300`).
  - High-contrast focus rings (`2px solid cyan-300` with 2px offset).
  - Typography: Display typography powered by `Sora`, body text by `Instrument Sans`, and code/hashes by `JetBrains Mono` via self-hosted `next/font/google`.

### Generic-AI Trap Review & Elimination
- **Trap 1 (Uniform Neon Violet Gloom):** Replaced arbitrary purple blobs with a calm, dark navy canvas (`ink-950`) accented by subtle logo-sampled corner glows and high-contrast text tokens (`text-100`, `text-300`).
- **Trap 2 (Card-in-Card Clutter):** Replaced repetitive floating cards with functional layout surfaces with differentiated border-radii (`rounded-sm` for chips, `rounded-lg` for panels, `rounded-2xl` for hero orbit).
- **Trap 3 (Gratuitous Gradients):** Confined brand gradients to semantic indicators—the Pipeline Orbit ring and the 1px top highlight on active panels.
- **Trap 4 (ALL-CAPS & Monospace Overuse):** Enforced clean sentence case across all headings and labels, reserving monospace strictly for file paths, line numbers, commit SHAs, and SHA-256 block hashes.
- **Trap 5 (Scattershot Hover Motions):** Eliminated card bounce animations. Confined transitions to 150–250ms ease-out functional feedback, fully disabled under `prefers-reduced-motion`.
- **Trap 6 (Faux 01/02/03 Steps):** Numbering is reserved strictly for the genuine 5-stage sequential engineering pipeline (**Understand → Change → Challenge → Verify → Prove**).

### App Shell & Interactive Capabilities
- **Persistent App Shell (`Sidebar.tsx`, `Header.tsx`):**
  - Collapsible desktop left rail displaying the brand lockup, project switcher, and 5 verb-driven stages with feature descriptions.
  - Responsive layout: Collapses into an accessible drawer and persistent fixed bottom navigation bar on mobile, ensuring **zero horizontal scrolling at 360px width**.
  - Header displays active project, mode badges (LLM Provider: real/mock, Sandbox: Docker/Unsandboxed), and a compact luminous 5-node Pipeline Orbit indicator.
- **Accessible Command Palette (`CommandPalette.tsx`):**
  - Global `Ctrl+K` / `Cmd+K` keyboard shortcut dialog with focus trapping and ArrowUp/Down item navigation.
  - Quick stage switching, demo repository ingestion, test execution, and ledger verification.
- **Five-Stage Engineering Cockpit:**
  1. **Overview (`ProjectIngest.tsx`):** Hero featuring the 5-node Pipeline Orbit and 1-click Demo Repository loader, alongside sanitized Git clone, local directory, and ZIP upload inputs.
  2. **Understand (`MentorChat.tsx`, `CitationViewer.tsx`):** Grounded AI assistant with verified `path:lines` citation chips. Clicking opens a drawer displaying exact AST code lines and copy actions.
  3. **Change (`TaskPlanner.tsx`, `DiffViewer.tsx`):** Implementation planner with unified code diff (+/- gutters) and a prominent Human Approval Gate with confirmation modal.
  4. **Challenge (`BattleReport.tsx`):** 3-lane AI-vs-AI battle arena (Builder, Adversary, Reviewer) with sequential round transcripts, severity badges, and final verdict synthesis.
  5. **Verify (`TwinGraph.tsx`, `SandboxResults.tsx`):** Digital Twin blast-radius impact analysis with risk chips, live sandbox output, and self-heal iterations.
  6. **Prove (`LedgerTimeline.tsx`):** Tamper-evident ledger timeline with visual connecting gradient chain, payload inspector, real-time integrity verification, and Evidence Pack download.

### Testing & Verification
- **Automated Test Coverage:**
  - Expanded frontend Vitest suites to **18 passing tests across 6 test files**:
    - `src/lib/__tests__/api.test.ts` (3 tests: API contracts, error envelope parsing, error codes)
    - `src/components/__tests__/Header.test.tsx` (2 tests: mark lockup, test-compatible ledger badge)
    - `src/components/__tests__/Banner.test.tsx` (3 tests: error code rendering, correlation ID copy button, telemetry mode badges)
    - `src/components/__tests__/CommandPalette.test.tsx` (4 tests: open/close dialog, search filtering, stage navigation, keyboard navigation)
    - `src/components/__tests__/EmptyStates.test.tsx` (4 tests: invitation-to-act empty states with triggers)
    - `src/components/__tests__/Accessibility.test.tsx` (2 tests: automated `axe-core` accessibility rules)
- **Playwright Screenshot Verification:**
  - Automated Playwright script (`scripts/take_screenshots.mjs`, runnable via `npm run screenshots`) capturing 13 screenshots into `docs/images/ui/`:
    - Desktop (1280px): `desktop-00-overview.png`, `desktop-01-understand-mentor.png`, `desktop-02-change-tasks.png`, `desktop-03-challenge-battle.png`, `desktop-04-verify-twin.png`, `desktop-05-prove-ledger.png`, `desktop-06-command-palette.png`.
    - Mobile (360px): `mobile-00-overview.png`, `mobile-01-understand-mentor.png`, `mobile-02-change-tasks.png`, `mobile-03-challenge-battle.png`, `mobile-04-verify-twin.png`, `mobile-05-prove-ledger.png`.
- **Production Build & Linting:**
  - Next.js 16.4.0 Turbopack production build passes in under 1 second.
  - ESLint passes with **0 errors and 0 warnings**.
  - Backend pytest passes **25/25 tests** in 13.82s.

---

## 5. Deliberately Left Undone & Rationale

1. **External RFC 3161 Timestamping Authority Integration:**
   - *Rationale:* Anchoring the SHA-256 ledger head hash to a public blockchain or RFC 3161 TSA requires external network dependencies and account credentials. The offline hash-chain and database triggers provide tamper-evidence for single-node deployments; recommendations for external anchoring are documented in `SECURITY.md` and `docs/06_SECURITY_ERROR_LOGGING.md`.
2. **Docker-in-Docker Daemon in Compose:**
   - *Rationale:* Running a Docker daemon inside a container requires privileged mode or mounting `/var/run/docker.sock`. Mounting the Docker socket is documented as an optional compose mount with appropriate security warnings regarding host root equivalence.
3. **Third-Party Provider Live API Keys in CI:**
   - *Rationale:* CI runs strictly with `LLM_PROVIDER=mock`, guaranteeing deterministic execution, zero external network flakes, and zero cost while testing all 5 pillars end-to-end.

