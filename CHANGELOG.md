# Changelog

All notable changes to the Parikshit platform will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-10-11

### Fixed
- **Backend Type Annotations**: Fixed missing `Tuple` imports in `sandbox_service.py` and `indexer_service.py` that caused potential runtime `NameError` exceptions during type inspection.
- **Frontend ESLint & TypeScript Compilation**: Resolved all 26 ESLint errors and warnings in `frontend/src/app/page.tsx`:
  - Removed unused lucide-react icon imports (`ShieldCheck`, `Cpu`, `Search`, `RotateCcw`, `ArrowRight`, `Database`, `Lock`, `FileText`).
  - Hoisted data fetching functions into `useCallback` hooks before `useEffect` to prevent cascading renders and satisfy `react-hooks/set-state-in-effect`.
  - Replaced all raw `any` types with strong TypeScript interfaces (`PlanStep`, `TaskItem`, `TestOutcome`, `SandboxRunResult`, `BattleRound`, `BattleReport`, `HealResult`, `TwinNode`, `TwinEdge`, `TwinGraphData`, `ImpactComparisonData`).
  - Escaped raw double quotes in JSX text.
  - Replaced standard `<img>` with Next.js `<Image />` component with fixed dimensions and `priority`.
- **Docker Compose Deployment Gap**: Created production multi-stage `frontend/Dockerfile` and `frontend/.dockerignore` for Next.js App Router, fixing broken `docker-compose.yml` service build.
- **Sandbox Container Security**: Hardened Docker runner invocation in `sandbox_service.py` to enforce `--user 1000:1000` non-root execution.

### Added
- **Secret Redaction in Retrieval**: Added regex-based `retrieval_service.redact_secrets` covering AWS access keys, high-entropy API tokens, bearer tokens, and private keys to prevent credential leakage into LLM contexts.
- **Safe ZIP Repository Ingestion**: Implemented safe extraction for uploaded/local `.zip` archives with strict directory traversal (Zip Slip) rejection (`PATH_TRAVERSAL_DETECTED`).
- **Full API Contracts Alignment (`docs/07_API_CONTRACTS_SUMMARY.md`)**:
  - `GET /api/v1/projects/{project_id}/revisions`: Revisions query list.
  - `GET /api/v1/projects/{project_id}/conversations`: Project conversation history.
  - `GET /api/v1/projects/{project_id}/starter-tasks`: Suggested onboarding tasks.
  - `GET /api/v1/projects/{project_id}/symbols`: Symbol search with query filtering.
  - `GET /api/v1/projects/{project_id}/ledger`: Project-scoped ledger query.
  - `GET /api/v1/projects/{project_id}/ledger/export`: Project cryptographic evidence pack export.
  - `POST /api/v1/tasks/{task_id}/plan`: Task plan generation / inspection.
  - `POST /api/v1/tasks/{task_id}/approve-plan`: Task plan user approval gate.
  - `POST /api/v1/workspaces/{workspace_id}/runs`: Isolated workspace test runner execution.
  - `GET /api/v1/runs/{run_id}`: Sandbox run status, test outcomes, and artifacts.
  - `GET /api/v1/runs/{run_id}/artifacts/{artifact_id}`: Sandbox evidence artifact download.
  - `GET /api/v1/battles/{battle_id}/report`: Final AI vs AI battle synthesis report.
  - `GET /api/v1/repair-attempts/{attempt_id}`: Self-healing repair attempt details.
  - `GET /api/v1/jobs/{job_id}`: Background job status.
  - `GET /api/v1/jobs/{job_id}/events`: Server-Sent Events (SSE) job progress stream.
  - `GET /api/v1/metrics`: System telemetry metrics.
- **Automated Verification Tests**:
  - `backend/tests/test_security_and_fixes.py`: Unit tests for typing, secret redaction, and safe/malicious ZIP handling.
  - `backend/tests/test_api_contracts.py`: Integration tests for all public API contracts ensuring standard `{ ok, data, error }` envelopes.

---

## [2.0.0] - 2026-10-10

- Initial release of Parikshit modular monolith (Codebase Mentor, Vibe Coding, AI vs AI Battle Arena, Self-Healing loop, Software Digital Twin, Proof-of-Work Ledger).
