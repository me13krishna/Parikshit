# Parikshit – API Contracts Summary

**Version:** 2.0  
**Base Path:** `/api/v1`  
**Style:** REST + Server-Sent Events (SSE) for long-running progress  
**Error Envelope:** Always `{ "ok": bool, "data"?: ..., "error"?: { code, message, details, correlation_id } }`  

Full OpenAPI 3.1 schema must be generated from Pydantic models and kept in sync with this contract.

---

## 1. Conventions

- All IDs are opaque strings (`prj_...`, `rev_...`, `job_...`, etc.).
- Timestamps are ISO-8601 UTC.
- Long-running operations return `202 Accepted` + `job_id`; progress via SSE or polling.
- Pagination: `?cursor=&limit=50` (cursor-based).
- Idempotency: `Idempotency-Key` header supported on create endpoints that mutate state.

---

## 2. Core Endpoint Groups

### Projects & Ingestion
| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects` | Create project (Git URL or ZIP) → returns job |
| GET | `/projects` | List projects |
| GET | `/projects/{id}` | Project detail + latest revision |
| GET | `/projects/{id}/revisions` | List revisions |
| GET | `/jobs/{id}` | Job status |
| GET | `/jobs/{id}/events` | SSE progress stream |

### Codebase Mentor
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/{id}/overview` | Architecture overview artifact |
| POST | `/projects/{id}/chat` | Send message → cited answer |
| GET | `/projects/{id}/conversations` | List conversations |
| GET | `/projects/{id}/tours` | List / get guided tours |
| GET | `/projects/{id}/starter-tasks` | Suggested tasks |
| GET | `/projects/{id}/files` | File tree / content (with range) |
| GET | `/projects/{id}/symbols` | Symbol search |

### Engineering Tasks (Vibe Coding)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{id}/tasks` | Create task from NL request |
| GET | `/tasks/{id}` | Task detail |
| POST | `/tasks/{id}/plan` | Generate / regenerate plan |
| POST | `/tasks/{id}/approve-plan` | User approves plan |
| POST | `/tasks/{id}/build` | Trigger Builder agent → workspace + patch |
| GET | `/tasks/{id}/diff` | Current unified diff |
| POST | `/tasks/{id}/run-checks` | Run sandbox checks |
| POST | `/tasks/{id}/approve` | Approve export / discard |

### QA & Sandbox
| Method | Path | Description |
|--------|------|-------------|
| POST | `/workspaces/{id}/runs` | Execute command / pytest in sandbox |
| GET | `/runs/{id}` | Run result + artifacts |
| GET | `/runs/{id}/artifacts/{aid}` | Download artifact |

### AI vs AI Battle
| Method | Path | Description |
|--------|------|-------------|
| POST | `/tasks/{id}/battles` | Start battle |
| GET | `/battles/{id}` | Battle status + rounds |
| GET | `/battles/{id}/report` | Final battle report |

### Self-Healing
| Method | Path | Description |
|--------|------|-------------|
| POST | `/runs/{id}/heal` | Start self-heal from a failing run |
| GET | `/repair-attempts/{id}` | Attempt detail + verdict |

### Digital Twin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/{id}/graph` | Dependency graph (nodes + edges) |
| POST | `/tasks/{id}/predict-impact` | Predicted affected files |
| GET | `/tasks/{id}/impact` | Predicted vs actual comparison |

### Ledger
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/{id}/ledger` | List entries (paginated) |
| GET | `/projects/{id}/ledger/export` | Full evidence pack (JSON) |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness + dependency checks |
| GET | `/metrics` | Optional Prometheus or JSON metrics |

---

## 3. Shared Object Schemas (Key)

**Citation**
```json
{
  "path": "src/auth/login.py",
  "start_line": 42,
  "end_line": 58,
  "commit_sha": "abc123...",
  "snippet_hash": "sha256:...",
  "verified": true
}
```

**Job**
```json
{
  "id": "job_...",
  "kind": "index",
  "status": "running",
  "progress": 0.65,
  "result": null,
  "error": null
}
```

**SandboxRun**
```json
{
  "id": "run_...",
  "command": "pytest -q",
  "exit_code": 1,
  "status": "failed",
  "duration_ms": 3400,
  "stdout": "...",
  "stderr": "..."
}
```

---

## 4. Non-Negotiable Contract Rules

1. Every citation returned to the client **must** have passed server-side verification.
2. No endpoint may apply a patch to the original repository storage; only workspaces.
3. Approval endpoints must write a ledger entry.
4. SSE streams must be resilient to reconnect (client sends `Last-Event-ID`).
5. All mutating endpoints that start long work return a job, never block > 5 s.

---

*Full detailed request/response bodies live in the generated OpenAPI document. This summary is the authoritative high-level contract for Antigravity.*
