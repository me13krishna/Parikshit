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
  ApiResponse,
  ApiError
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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

    const body: ApiResponse<T> = await res.json().catch(() => ({
      success: false,
      data: null as unknown as T,
      error: {
        message: `HTTP ${res.status}: Failed to parse JSON response`,
        code: "INVALID_RESPONSE",
        status_code: res.status
      }
    }));

    if (!res.ok || !body.success) {
      const errorPayload: ApiError = body.error || {
        message: `HTTP ${res.status}: Server request failed`,
        code: `HTTP_${res.status}`,
        status_code: res.status
      };
      throw new ApiClientError(errorPayload);
    }

    return body.data;
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
    return request("/projects/ingest", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async uploadZip(file: File, name: string): Promise<{ project_id: string; default_revision_id: string; name: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("source_type", "zip");
    return request("/projects/ingest", {
      method: "POST",
      body: formData
    });
  },

  async listProjects(): Promise<Array<{ id: string; name: string; source_type: string; default_revision_id: string }>> {
    return request("/projects");
  },

  // Mentor & Understanding
  async askMentor(revisionId: string, question: string, sessionId?: string) {
    return request<{
      answer: string;
      grounded: boolean;
      citations: Array<{ path: string; start_line: number; end_line: number; snippet?: string; verified?: boolean }>;
      uncertainty_notes?: string;
      session_id: string;
    }>("/mentor/chat", {
      method: "POST",
      body: JSON.stringify({
        revision_id: revisionId,
        question,
        session_id: sessionId
      })
    });
  },

  async getArchitecture(revisionId: string): Promise<ArchitectureOverview> {
    return request<ArchitectureOverview>(`/mentor/overview?revision_id=${encodeURIComponent(revisionId)}`);
  },

  async getTours(revisionId: string): Promise<TourItem[]> {
    return request<TourItem[]>(`/mentor/tours?revision_id=${encodeURIComponent(revisionId)}`);
  },

  // Tasks & Builder
  async createTask(projectId: string, requestText: string): Promise<TaskItem> {
    return request<TaskItem>("/tasks", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, request_text: requestText })
    });
  },

  async buildTask(taskId: string): Promise<{
    task_id: string;
    workspace_id: string;
    patch_id: string;
    files_changed: string[];
    unified_diff: string;
    status: string;
  }> {
    return request(`/tasks/${taskId}/build`, {
      method: "POST"
    });
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
  async getTwinGraph(revisionId: string): Promise<{ nodes: TwinNode[]; edges: Array<{ from: string; to: string }> }> {
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
    return request<LedgerEntry[]>(`/ledger/entries${q}`);
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
