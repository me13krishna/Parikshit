-- Parikshit SQLite Database Schema v2.0
-- PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_type TEXT CHECK (source_type IN ('git_url', 'zip', 'local')),
    source_uri TEXT,
    created_at TEXT NOT NULL,
    status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS repo_revisions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    commit_sha TEXT NOT NULL,
    parent_revision_id TEXT,
    storage_path TEXT NOT NULL,
    file_count INTEGER DEFAULT 0,
    byte_size INTEGER DEFAULT 0,
    line_count INTEGER DEFAULT 0,
    languages TEXT DEFAULT '{}',
    index_status TEXT CHECK (index_status IN ('pending', 'running', 'complete', 'failed')) DEFAULT 'pending',
    indexed_at TEXT,
    UNIQUE(project_id, commit_sha)
);

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    revision_id TEXT NOT NULL REFERENCES repo_revisions(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    language TEXT,
    size_bytes INTEGER DEFAULT 0,
    line_count INTEGER DEFAULT 0,
    content_sha256 TEXT,
    kind TEXT CHECK (kind IN ('source', 'test', 'config', 'doc', 'asset', 'generated', 'other')) DEFAULT 'source',
    importance_score REAL DEFAULT 0.0,
    importance_signals TEXT DEFAULT '{}',
    is_binary INTEGER DEFAULT 0,
    is_ignored INTEGER DEFAULT 0,
    UNIQUE(revision_id, path)
);

CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS symbols (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    signature TEXT,
    docstring TEXT
);

CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,
    revision_id TEXT NOT NULL REFERENCES repo_revisions(id) ON DELETE CASCADE,
    from_symbol_id TEXT,
    to_symbol_id TEXT,
    edge_type TEXT NOT NULL,
    evidence TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS doc_artifacts (
    id TEXT PRIMARY KEY,
    revision_id TEXT NOT NULL REFERENCES repo_revisions(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'grounded',
    uncertainty_notes TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS citations (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    commit_sha TEXT,
    snippet_hash TEXT,
    verified INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tours (
    id TEXT PRIMARY KEY,
    revision_id TEXT NOT NULL REFERENCES repo_revisions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tour_steps (
    id TEXT PRIMARY KEY,
    tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    start_line INTEGER,
    end_line INTEGER
);

CREATE TABLE IF NOT EXISTS starter_tasks (
    id TEXT PRIMARY KEY,
    revision_id TEXT NOT NULL REFERENCES repo_revisions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    rationale TEXT,
    related_files TEXT DEFAULT '[]',
    risk_level TEXT DEFAULT 'low',
    status TEXT DEFAULT 'open',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    revision_id TEXT NOT NULL REFERENCES repo_revisions(id) ON DELETE CASCADE,
    request_text TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'planning', 'building', 'review', 'approved', 'rejected', 'failed')) DEFAULT 'pending',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    approved_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    base_revision_id TEXT NOT NULL REFERENCES repo_revisions(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    status TEXT CHECK (status IN ('active', 'applied', 'discarded')) DEFAULT 'active',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patches (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    unified_diff TEXT NOT NULL,
    files_changed TEXT DEFAULT '[]',
    created_by_agent TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sandbox_runs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    command TEXT NOT NULL,
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    duration_ms INTEGER,
    resource_usage TEXT DEFAULT '{}',
    status TEXT CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'timeout')) DEFAULT 'queued',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS test_results (
    id TEXT PRIMARY KEY,
    sandbox_run_id TEXT NOT NULL REFERENCES sandbox_runs(id) ON DELETE CASCADE,
    test_id TEXT NOT NULL,
    outcome TEXT CHECK (outcome IN ('passed', 'failed', 'skipped', 'error')),
    message TEXT,
    duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS evidence_artifacts (
    id TEXT PRIMARY KEY,
    sandbox_run_id TEXT NOT NULL REFERENCES sandbox_runs(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    status TEXT,
    parent_run_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS battles (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS battle_rounds (
    id TEXT PRIMARY KEY,
    battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    builder_patch_id TEXT,
    adversary_challenge TEXT,
    test_run_id TEXT,
    reviewer_summary TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_findings (
    id TEXT PRIMARY KEY,
    battle_round_id TEXT,
    agent_role TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT,
    suggested_test TEXT,
    related_locations TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS repair_attempts (
    id TEXT PRIMARY KEY,
    baseline_run_id TEXT NOT NULL REFERENCES sandbox_runs(id),
    attempt_number INTEGER NOT NULL,
    diagnosis TEXT NOT NULL,
    patch_id TEXT,
    verification_run_id TEXT,
    verdict TEXT CHECK (verdict IN ('verified_fix', 'attempted_fix', 'unverified', 'failed', 'inconclusive', 'FIXED', 'PARTIALLY_FIXED', 'NOT_FIXED', 'UNSAFE_TO_AUTO_FIX')),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    decision TEXT CHECK (decision IN ('approved', 'rejected')),
    decided_at TEXT NOT NULL,
    actor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    prev_hash TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    related_ids TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    sequence INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    status TEXT CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')) DEFAULT 'queued',
    progress REAL DEFAULT 0.0,
    result TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);

CREATE TABLE IF NOT EXISTS llm_usage (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    estimated_cost_usd REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_revisions_project ON repo_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_files_revision ON files(revision_id);
CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Ledger strict integrity: unique sequence per project and unique sequence for global chain
CREATE UNIQUE INDEX IF NOT EXISTS uidx_ledger_project_seq ON ledger_entries(project_id, sequence) WHERE project_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_ledger_global_seq ON ledger_entries(sequence) WHERE project_id IS NULL;

-- Database-level immutability triggers for ledger_entries
CREATE TRIGGER IF NOT EXISTS trg_ledger_entries_no_update
BEFORE UPDATE ON ledger_entries
BEGIN
    SELECT RAISE(ABORT, 'Ledger entries are strictly immutable and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_ledger_entries_no_delete
BEFORE DELETE ON ledger_entries
BEGIN
    SELECT RAISE(ABORT, 'Ledger entries are strictly immutable and cannot be deleted');
END;

-- FTS5 Full-Text Search Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS fts_code USING fts5(
    chunk_id UNINDEXED,
    file_path,
    content,
    tokenize='porter unicode61'
);
