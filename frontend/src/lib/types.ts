export interface HealthData {
  status: string;
  database: string;
  sandbox: string;
  sandbox_mode?: "docker" | "host" | "disabled";
  llm_provider: string;
  llm_mode?: "real" | "mock";
  llm_ready: boolean;
  environment: string;
  version: string;
}

export interface LedgerEntry {
  id: string;
  sequence: number;
  project_id?: string | null;
  event_type: string;
  prev_hash: string;
  content_hash: string;
  created_at: string;
  payload: Record<string, unknown>;
}

export interface LedgerVerifyResult {
  valid: boolean;
  chain_length?: number;
  count?: number;
  last_hash?: string;
  error?: string;
  broken_at_sequence?: number;
  projects?: Record<string, { valid: boolean; count: number; error?: string; broken_at_sequence?: number }>;
  global_chain?: { valid: boolean; count: number; error?: string; broken_at_sequence?: number };
}

export interface EvidencePack {
  timestamp: string;
  app_version: string;
  verification: LedgerVerifyResult;
  entries_count: number;
  entries: LedgerEntry[];
  llm_usage?: {
    total_tokens?: number;
    estimated_cost_usd?: number;
  };
}

export interface Citation {
  path: string;
  start_line: number;
  end_line: number;
  commit_sha?: string;
  snippet?: string;
  snippet_hash?: string;
  verified?: boolean;
  error?: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  status?: string;
  grounded?: boolean;
  citations?: Citation[];
  uncertainty_notes?: string;
  timestamp?: string;
}

export interface ComponentItem {
  name: string;
  responsibility: string;
  files: string[];
  citations?: Citation[];
}

export interface RelationshipItem {
  from: string;
  to: string;
  type: string;
  citations?: Citation[];
}

export interface ArchitectureOverview {
  components: ComponentItem[];
  relationships: RelationshipItem[];
}

export interface TourStep {
  step_number: number;
  title: string;
  description: string;
  path: string;
  start_line?: number;
  end_line?: number;
}

export interface TourItem {
  id: string;
  title: string;
  description: string;
  steps: TourStep[];
}

export interface PlanStep {
  step: number;
  path: string;
  description: string;
}

export interface TaskPlan {
  summary?: string;
  steps?: PlanStep[];
  files_affected?: string[];
  risk_level?: "low" | "medium" | "high";
}

export interface TaskItem {
  id: string;
  project_id: string;
  request_text: string;
  status: "planning" | "approved" | "building" | "review" | "completed" | "failed";
  plan_json?: string;
  patch_id?: string;
  approval_status?: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface SandboxTestCase {
  test_id: string;
  outcome: "passed" | "failed" | "skipped";
  duration_ms?: number;
  message?: string;
}

export interface SandboxResult {
  run_id: string;
  task_id?: string;
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  created_at: string;
  is_unsandboxed?: boolean;
  tests?: SandboxTestCase[];
}

export interface AdversarialChallenge {
  round: number;
  severity: "high" | "medium" | "low";
  challenge_title: string;
  challenge_description: string;
  suggested_test?: string;
  test_code?: string;
}

export interface BattleRound {
  round: number;
  builder_summary?: string;
  adversary_challenge: AdversarialChallenge;
  sandbox_exit_code: number;
  sandbox_stdout: string;
  reviewer_verdict: string;
  reviewer_summary: string;
  residual_risks: string[];
}

export interface BattleReportData {
  battle_id: string;
  task_id: string;
  total_rounds: number;
  final_verdict: "approved" | "approved_with_risks" | "rejected";
  challenges_raised: AdversarialChallenge[];
  residual_risks: string[];
  rounds: BattleRound[];
  mode?: "real" | "mock";
}

export interface HealAttempt {
  attempt_number: number;
  hypothesis: string;
  target_file: string;
  exit_code: number;
  verdict: "FIXED" | "PARTIALLY_FIXED" | "NOT_FIXED" | "UNSAFE_TO_AUTO_FIX";
}

export interface HealResult {
  heal_id: string;
  baseline_run_id: string;
  verdict: "FIXED" | "PARTIALLY_FIXED" | "NOT_FIXED" | "UNSAFE_TO_AUTO_FIX";
  iterations: HealAttempt[];
  diagnosis?: {
    hypotheses?: Array<{ rank: number; description: string; target_file: string; confidence: number }>;
  };
}

export interface TwinNode {
  id: string;
  label: string;
  path?: string;
  kind?: string;
  type?: "file" | "class" | "function" | string;
  language?: string;
  importance?: number;
  lines?: number;
  callers?: string[];
  callees?: string[];
}

export interface TwinEdge {
  id?: string;
  source: string;
  target: string;
  from?: string;
  to?: string;
  type?: string;
  label?: string;
}

export interface TwinImpact {
  changed_file: string;
  affected_files: string[];
  blast_radius_score: number;
  risk_level: "low" | "medium" | "high";
  affected_tests: string[];
}

export interface ApiError {
  message: string;
  code: string;
  status_code: number;
  correlation_id?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
}
