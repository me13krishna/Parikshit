import {
  HealthData,
  LedgerEntry,
  LedgerVerifyResult,
  EvidencePack,
  ArchitectureOverview,
  TourItem,
  TaskItem,
  SandboxResult,
  BattleReportData,
  HealResult,
  TwinImpact,
  TwinNode,
  TwinEdge,
  RepoFile,
  ApiError
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000/api/v1";

export class ApiClientError extends Error {
  code: string;
  statusCode: number;
  correlationId?: string;
  details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.code = error.code || "UNKNOWN_ERROR";
    this.statusCode = error.status_code || 500;
    this.correlationId = error.correlation_id;
    this.details = error.details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const apiKey = process.env.NEXT_PUBLIC_PARIKSHIT_API_KEY;
  if (apiKey && !headers.has("X-API-Key")) {
    headers.set("X-API-Key", apiKey);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    interface RawApiResponse<D> {
      ok?: boolean;
      success?: boolean;
      data?: D;
      error?: ApiError;
      [key: string]: unknown;
    }

    const body = (await res.json().catch(() => ({
      ok: false,
      success: false,
      data: null as unknown as T,
      error: {
        message: `HTTP ${res.status}: Failed to parse JSON response`,
        code: "INVALID_RESPONSE",
        status_code: res.status
      }
    }))) as RawApiResponse<T>;

    const isSuccess = body.ok === true || body.success === true;
    if (!res.ok || !isSuccess) {
      const errorPayload: ApiError = body.error || {
        message: `HTTP ${res.status}: Server request failed`,
        code: `HTTP_${res.status}`,
        status_code: res.status
      };
      throw new ApiClientError(errorPayload);
    }

    return (body.data !== undefined ? body.data : body) as T;
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiClientError({
        message: "Request timed out after 60s",
        code: "REQUEST_TIMEOUT",
        status_code: 408
      });
    }
    throw new ApiClientError({
      message: err instanceof Error ? err.message : "Network error occurred",
      code: "NETWORK_ERROR",
      status_code: 503
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // System Health
  async getHealth(): Promise<HealthData> {
    return request<HealthData>("/health");
  },

  // Projects & Ingestion
  async ingestProject(data: {
    source_type: "git" | "local" | "zip";
    source_uri?: string;
    name: string;
    branch?: string;
  }): Promise<{ project_id: string; default_revision_id: string; name: string }> {
    const res = await request<Record<string, unknown>>("/projects/ingest", {
      method: "POST",
      body: JSON.stringify(data)
    });
    return {
      project_id: String(res.project_id || ""),
      default_revision_id: String(res.default_revision_id || res.revision_id || ""),
      name: String(res.name || "")
    };
  },

  async uploadZip(file: File, name: string): Promise<{ project_id: string; default_revision_id: string; name: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("source_type", "zip");
    const res = await request<Record<string, unknown>>("/projects/ingest", {
      method: "POST",
      body: formData
    });
    return {
      project_id: String(res.project_id || ""),
      default_revision_id: String(res.default_revision_id || res.revision_id || ""),
      name: String(res.name || "")
    };
  },

  async listProjects(): Promise<Array<{ id: string; name: string; source_type: string; default_revision_id: string }>> {
    const res = await request<
      | { projects: Array<{ id: string; name: string; source_type: string; default_revision_id: string }> }
      | Array<{ id: string; name: string; source_type: string; default_revision_id: string }>
    >("/projects");
    if (Array.isArray(res)) return res;
    if (res && "projects" in res && Array.isArray(res.projects)) return res.projects;
    return [];
  },

  // Mentor & Understanding
  async askMentor(revisionId: string, question: string, sessionId?: string) {
    const res = await request<Record<string, unknown>>("/mentor/chat", {
      method: "POST",
      body: JSON.stringify({
        revision_id: revisionId,
        question,
        session_id: sessionId
      })
    });
    return {
      answer: String(res.answer || res.answer_markdown || ""),
      grounded: res.grounded !== undefined ? Boolean(res.grounded) : (res.status === "grounded"),
      citations: (res.citations || []) as Array<{ path: string; start_line: number; end_line: number; snippet?: string; verified?: boolean }>,
      uncertainty_notes: res.uncertainty_notes as string | undefined,
      session_id: (res.session_id || res.conversation_id) as string | undefined
    };
  },

  async getArchitecture(revisionId: string): Promise<ArchitectureOverview> {
    return request<ArchitectureOverview>(`/mentor/overview?revision_id=${encodeURIComponent(revisionId)}`);
  },

  async getTours(revisionId: string): Promise<TourItem[]> {
    return request<TourItem[]>(`/mentor/tours?revision_id=${encodeURIComponent(revisionId)}`);
  },

  async getFiles(projectId: string): Promise<RepoFile[]> {
    const res = await request<{ files: RepoFile[]; count: number }>(`/mentor/${encodeURIComponent(projectId)}/files`);
    return res.files || [];
  },

  async getStarterTasks(projectId: string): Promise<Array<{ id: string; title: string; rationale?: string; risk_level?: string; status?: string }>> {
    const res = await request<{ starter_tasks: Array<{ id: string; title: string; rationale?: string; risk_level?: string; status?: string }> }>(
      `/projects/${encodeURIComponent(projectId)}/starter-tasks`
    );
    return res.starter_tasks || [];
  },

  // Tasks & Builder
  async createTask(projectId: string, requestText: string): Promise<TaskItem> {
    const res = await request<Record<string, unknown>>("/tasks", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, request_text: requestText })
    });
    return {
      id: String(res.id || res.task_id || ""),
      project_id: String(res.project_id || projectId),
      request_text: String(res.request_text || requestText),
      status: (String(res.status || "planning") as TaskItem["status"]),
      plan_json: res.plan_json ? String(res.plan_json) : (res.plan ? JSON.stringify(res.plan) : undefined),
      created_at: String(res.created_at || new Date().toISOString()),
      updated_at: String(res.updated_at || new Date().toISOString())
    };
  },

  async buildTask(taskId: string): Promise<{
    task_id: string;
    workspace_id: string;
    patch_id: string;
    files_changed: string[];
    unified_diff: string;
    status: string;
  }> {
    const res = await request<Record<string, unknown>>(`/tasks/${taskId}/build`, {
      method: "POST"
    });
    return {
      task_id: String(res.task_id || taskId),
      workspace_id: String(res.workspace_id || ""),
      patch_id: String(res.patch_id || ""),
      files_changed: (res.files_changed || []) as string[],
      unified_diff: String(res.unified_diff || ""),
      status: String(res.status || "review")
    };
  },

  async approveTask(taskId: string, decision: "approved" | "rejected", reason?: string) {
    return request(`/tasks/${taskId}/approve`, {
      method: "POST",
      body: JSON.stringify({ decision, reason })
    });
  },

  async exportTask(taskId: string) {
    return request<{ status: string; unified_diff: string }>(`/tasks/${taskId}/export`, {
      method: "POST"
    });
  },

  async runChecks(taskId: string, checkProfile: "pytest" | "pytest_coverage" = "pytest"): Promise<SandboxResult> {
    return request<SandboxResult>(`/tasks/${taskId}/run-checks?command=${encodeURIComponent(checkProfile)}`, {
      method: "POST"
    });
  },

  // AI-vs-AI Battle
  async runBattle(taskId: string, maxRounds: number = 2): Promise<BattleReportData> {
    return request<BattleReportData>(`/battles/run`, {
      method: "POST",
      body: JSON.stringify({ task_id: taskId, max_rounds: maxRounds })
    });
  },

  // Self-Healing
  async triggerSelfHeal(runId: string, maxAttempts: number = 2): Promise<HealResult> {
    return request<HealResult>(`/healing/diagnose`, {
      method: "POST",
      body: JSON.stringify({ run_id: runId, max_attempts: maxAttempts })
    });
  },

  // Digital Twin
  async getTwinGraph(revisionId: string): Promise<{ nodes: TwinNode[]; edges: TwinEdge[] }> {
    return request(`/twin/graph?revision_id=${encodeURIComponent(revisionId)}`);
  },

  async simulateTwinImpact(revisionId: string, fileChanged: string): Promise<TwinImpact> {
    return request(`/twin/simulate-change`, {
      method: "POST",
      body: JSON.stringify({ revision_id: revisionId, changed_file: fileChanged })
    });
  },

  // Ledger & Proof-of-Work
  async getLedgerEntries(projectId?: string, limit: number = 50): Promise<LedgerEntry[]> {
    const q = projectId ? `?project_id=${encodeURIComponent(projectId)}&limit=${limit}` : `?limit=${limit}`;
    const res = await request<LedgerEntry[] | { entries: LedgerEntry[] }>(`/ledger/entries${q}`);
    if (Array.isArray(res)) return res;
    if (res && "entries" in res && Array.isArray(res.entries)) return res.entries;
    return [];
  },

  async verifyLedger(projectId?: string): Promise<LedgerVerifyResult> {
    const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
    return request<LedgerVerifyResult>(`/ledger/verify${q}`);
  },

  async getEvidencePack(projectId?: string): Promise<EvidencePack> {
    const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
    return request<EvidencePack>(`/ledger/evidence-pack${q}`);
  }
};
