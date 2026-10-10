# Parikshit – Data Dictionary & Schema Specification

**Version:** 2.0  
**Database:** SQLite (WAL mode) for MVP → Postgres-compatible later  
**Conventions:**  
- Primary keys are text (prefixed ULIDs or UUIDv7 style: `prj_...`, `rev_...`, `fil_...`, etc.)  
- Timestamps stored as ISO-8601 text (UTC)  
- JSON columns use SQLite JSON1  
- Soft deletes avoided; use status fields  
- All monetary / cost values in integer micro-units or tokens  

---

## 1. Entity Relationship Overview

```
users (optional in MVP)
  └── projects
        └── repo_revisions
              ├── files
              │     ├── chunks
              │     └── symbols
              ├── edges (import / call / route)
              ├── doc_artifacts (overviews, tours…)
              └── conversations → messages → citations

tasks → plans → workspaces → patches
sandbox_runs → test_results → evidence_artifacts
agent_runs → battles → battle_rounds → agent_findings
repair_attempts
approvals
ledger_entries (hash chain)
jobs
```

---

## 2. Core Tables

### 2.1 Identity & Repository

#### `users` (optional for MVP single-user mode)
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | `usr_...` |
| display_name | text | |
| created_at | text | |

#### `projects`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | text PK | | `prj_...` |
| name | text | NOT NULL | |
| source_type | text | CHECK (git_url, zip, local) | |
| source_uri | text | | Original URL or filename |
| created_at | text | NOT NULL | |
| status | text | CHECK (active, archived) | |

#### `repo_revisions`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | text PK | | `rev_...` |
| project_id | text FK | NOT NULL | |
| commit_sha | text | NOT NULL | For archives: content hash |
| parent_revision_id | text FK | NULL | |
| storage_path | text | NOT NULL | Absolute path to checkout |
| file_count | integer | | |
| byte_size | integer | | |
| line_count | integer | | |
| languages | json | | `{"python": 120, "typescript": 40}` |
| index_status | text | pending/running/complete/failed | |
| indexed_at | text | | |
| UNIQUE(project_id, commit_sha) | | | |

#### `files`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | `fil_...` |
| revision_id | text FK | |
| path | text | repo-relative, forward slashes |
| language | text | |
| size_bytes | integer | |
| line_count | integer | |
| content_sha256 | text | |
| kind | text | source/test/config/doc/asset/generated/other |
| importance_score | real | default 0 |
| importance_signals | json | |
| is_binary | integer | 0/1 |
| is_ignored | integer | 0/1 |
| UNIQUE(revision_id, path) | | |

#### `chunks`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| file_id | text FK | |
| start_line | integer | |
| end_line | integer | |
| content | text | |
| content_hash | text | |
| embedding_id | text | NULL in MVP (future) |

#### `symbols`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| file_id | text FK | |
| name | text | |
| kind | text | function/class/method/route/variable/... |
| start_line | integer | |
| end_line | integer | |
| signature | text | |
| docstring | text | |

#### `edges`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| revision_id | text FK | |
| from_symbol_id | text | |
| to_symbol_id | text | |
| edge_type | text | import/call/route_handler/inherit |
| evidence | json | path + lines if available |

---

### 2.2 Mentor Artifacts

#### `doc_artifacts`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| revision_id | text FK | |
| kind | text | architecture_overview / other |
| content | json | structured overview |
| created_at | text | |

#### `conversations` / `messages` / `citations`
- Standard chat model.
- Every citation row must pass server-side verification before being marked `verified = 1`.
- Citation fields: path, start_line, end_line, commit_sha, snippet_hash, verified.

#### `tours` / `tour_steps`
- Ordered steps with citation references.

#### `starter_tasks`
- title, rationale, related_file_ids, risk_level, status.

---

### 2.3 Engineering Work

#### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| project_id | text FK | |
| revision_id | text FK | base revision |
| request_text | text | user natural language |
| status | text | pending/planning/building/review/approved/rejected/failed |

#### `plans`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| task_id | text FK | |
| content | json | structured plan steps |
| approved_at | text | NULL until user approves |

#### `workspaces`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| task_id | text FK | |
| base_revision_id | text FK | |
| storage_path | text | isolated checkout |
| status | text | active/applied/discarded |

#### `patches`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| workspace_id | text FK | |
| unified_diff | text | |
| files_changed | json | |
| created_by_agent | text | role name |

---

### 2.4 Execution & Evidence

#### `sandbox_runs`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| workspace_id | text FK | nullable for pure read runs |
| command | text | |
| exit_code | integer | |
| stdout | text | |
| stderr | text | |
| duration_ms | integer | |
| resource_usage | json | |
| status | text | queued/running/succeeded/failed/timeout |

#### `test_results`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| sandbox_run_id | text FK | |
| test_id | text | nodeid or equivalent |
| outcome | text | passed/failed/skipped/error |
| message | text | |
| duration_ms | integer | |

#### `evidence_artifacts`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| sandbox_run_id | text FK | |
| kind | text | log/screenshot/coverage/other |
| storage_path | text | |
| content_hash | text | |

#### `bug_reports`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| task_id / battle_id | text | |
| severity | text | |
| title | text | |
| steps | text | |
| expected | text | |
| actual | text | |
| evidence_ids | json | |

---

### 2.5 Agents, Battles, Repair

#### `agent_runs`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| role | text | mentor/builder/adversary/reviewer/healer |
| input_tokens | integer | |
| output_tokens | integer | |
| latency_ms | integer | |
| status | text | |
| parent_run_id | text | for multi-turn |

#### `battles` / `battle_rounds`
- battle links to a task or patch.
- rounds contain adversary challenges, test results, reviewer summary.

#### `agent_findings`
- structured findings from adversary or reviewer.

#### `repair_attempts`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| baseline_run_id | text FK | |
| attempt_number | integer | |
| diagnosis | json | ranked hypotheses |
| patch_id | text FK | |
| verification_run_id | text FK | |
| verdict | text | verified_fix / attempted_fix / unverified / failed / inconclusive |

---

### 2.6 Approvals, Ledger, Jobs

#### `approvals`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| target_type | text | patch / export / merge |
| target_id | text | |
| decision | text | approved / rejected |
| decided_at | text | |
| actor | text | user or system |

#### `ledger_entries` (immutable)
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| prev_hash | text | |
| content_hash | text | SHA-256 of canonical payload |
| event_type | text | project_ingested, plan_created, patch_applied, battle_round, approval, … |
| payload | json | |
| related_ids | json | |
| created_at | text | |
| sequence | integer | monotonic per project or global |

**Integrity rule:** Application must refuse to insert an entry whose `prev_hash` does not match the latest entry’s `content_hash`.

#### `jobs`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| kind | text | index / battle / heal / … |
| status | text | queued/running/succeeded/failed/cancelled |
| progress | real | 0–1 |
| result | json | |
| error | text | |
| created_at / started_at / finished_at | text | |

---

## 3. Indexing Recommendations (SQLite)

- FTS5 virtual table on `chunks.content` + `symbols.name`
- Indexes on foreign keys and high-cardinality filters (`revision_id`, `project_id`, `status`, `event_type`)
- Partial indexes for active workspaces / running jobs

---

## 4. Migration Notes

- All schema changes go through versioned migrations.
- SQLite → Postgres path: mostly type changes (text → timestamptz, json → jsonb) and sequence handling.
- Never rewrite ledger history; only append.

---

*Schema derived primarily from the Claude Database Schema document with minor normalisations for clarity and Postgres portability.*
