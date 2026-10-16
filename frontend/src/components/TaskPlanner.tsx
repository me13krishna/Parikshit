"use client";

import React, { useState } from "react";
import {
  Hammer,
  CheckCircle2,
  XCircle,
  Download,
  Play,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { TaskItem, TaskPlan, SandboxResult } from "../lib/types";
import { api, ApiClientError } from "../lib/api";
import { DiffViewer } from "./DiffViewer";
import { SandboxResults } from "./SandboxResults";

interface TaskPlannerProps {
  projectId: string;
  onError: (err: ApiClientError) => void;
  onSandboxRunComplete?: (result: SandboxResult) => void;
  initialPrompt?: string;
}

export const TaskPlanner: React.FC<TaskPlannerProps> = ({
  projectId,
  onError,
  onSandboxRunComplete,
  initialPrompt,
}) => {
  const [requestText, setRequestText] = useState<string>(
    initialPrompt || "Implement robust multiply operation and unit tests"
  );
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [plan, setPlan] = useState<TaskPlan | null>(null);
  const [diff, setDiff] = useState<string>("");
  const [filesChanged, setFilesChanged] = useState<string[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [sandboxResult, setSandboxResult] = useState<SandboxResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [exported, setExported] = useState<boolean>(false);
  const [confirmExportModal, setConfirmExportModal] = useState<boolean>(false);

  // 1. Create Task & Generate Plan
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;

    setLoading(true);
    try {
      const task = await api.createTask(projectId, requestText.trim());
      setActiveTask(task);
      if (task.plan_json) {
        try {
          setPlan(JSON.parse(task.plan_json));
        } catch {
          setPlan({ summary: "Plan generated." });
        }
      }
      setDiff("");
      setFilesChanged([]);
      setApprovalStatus("pending");
      setSandboxResult(null);
      setExported(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Build Patch in Workspace Sandbox
  const handleBuild = async () => {
    if (!activeTask) return;
    setActionLoading("build");
    try {
      const res = await api.buildTask(activeTask.id);
      setDiff(res.unified_diff || "");
      setFilesChanged(res.files_changed || []);
      setActiveTask((prev) => (prev ? { ...prev, status: "review" } : null));
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Human Gate: Approve or Reject
  const handleApprove = async (decision: "approved" | "rejected") => {
    if (!activeTask) return;
    setActionLoading("approve");
    try {
      await api.approveTask(activeTask.id, decision);
      setApprovalStatus(decision);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Export / Apply to Source Files
  const handleConfirmExport = async () => {
    if (!activeTask) return;
    setActionLoading("export");
    try {
      await api.exportTask(activeTask.id);
      setExported(true);
      setConfirmExportModal(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setActionLoading(null);
    }
  };

  // 5. Run Isolated Sandbox Checks
  const handleRunChecks = async (profile: "pytest" | "pytest_coverage" = "pytest") => {
    if (!activeTask) return;
    setActionLoading("sandbox");
    try {
      const res = await api.runChecks(activeTask.id, profile);
      setSandboxResult(res);
      if (onSandboxRunComplete) onSandboxRunComplete(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header Context */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[var(--surface-2)] text-[#2DD4BF] border border-[var(--border-subtle)]">
            <Hammer className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-primary)] font-sans">
              AI Coding Agent
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Formulate implementation plans, review unified diffs, and enforce human approval
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-primary)] bg-[var(--surface-2)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
          <span>Stage 2: Build</span>
        </div>
      </div>

      {/* Task Specification Card */}
      <section className="rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-semibold text-[var(--text-primary)] font-sans">
          Specify Engineering Task or Feature Request
        </h3>
        <form onSubmit={handleCreateTask} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="Describe the requested feature, bugfix, or refactor..."
            className="flex-1 px-3.5 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#5E6AD2] placeholder-[var(--text-muted)]"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 rounded-lg bg-[var(--text-primary)] hover:opacity-90 disabled:opacity-50 text-[var(--bg-primary)] text-xs font-semibold flex items-center justify-center gap-2 transition-opacity shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5E6AD2]" />
                <span>Formulating Plan...</span>
              </>
            ) : (
              <span>Plan Task</span>
            )}
          </button>
        </form>
      </section>

      {/* Empty State before Plan (Must contain: 'No active change task created yet.') */}
      {!activeTask && (
        <div className="p-8 text-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] text-xs space-y-1.5">
          <p className="font-medium text-[var(--text-primary)]">No active change task created yet.</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Type a task description above (e.g. &ldquo;Implement robust multiply operation&rdquo;) and click &ldquo;Plan Task&rdquo;.
          </p>
        </div>
      )}

      {/* Task & Plan Breakdown */}
      {activeTask && (
        <section className="rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-[var(--text-primary)]">
                Task: {activeTask.id}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--surface-2)] text-[#5E6AD2] border border-[var(--border-subtle)]">
                Status: {activeTask.status}
              </span>
            </div>

            {/* Build & Sandbox Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleBuild}
                disabled={actionLoading === "build"}
                className="px-3 py-1.5 rounded-md bg-[var(--text-primary)] hover:opacity-90 disabled:opacity-50 text-[var(--bg-primary)] text-xs font-semibold flex items-center gap-1.5 transition-opacity"
              >
                {actionLoading === "build" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>Build in Sandbox</span>
              </button>

              <button
                onClick={() => handleRunChecks("pytest")}
                disabled={actionLoading === "sandbox"}
                className="px-3 py-1.5 rounded-md bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-primary)] text-xs font-mono transition-colors border border-[var(--border-subtle)]"
              >
                {actionLoading === "sandbox" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Run Checks"
                )}
              </button>
            </div>
          </div>

          {/* Structured Step Breakdown */}
          {plan && (
            <div className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border-subtle)] text-xs space-y-2">
              <div className="text-[var(--text-primary)] font-medium">{plan.summary}</div>
              {plan.steps && (
                <ul className="space-y-1.5 text-[var(--text-secondary)] text-[11px]">
                  {plan.steps.map((st, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[#5E6AD2] font-semibold">
                        #{st.step || i + 1}
                      </span>
                      <span>{st.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Unified Diff Viewer */}
          {diff && <DiffViewer diff={diff} filesChanged={filesChanged} />}

          {/* Prominent Human Approval Gate */}
          {diff && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#2DD4BF]" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] font-sans">
                      Human Approval Gate
                    </span>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Explicit developer sign-off required before patch applies to repository source.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">State:</span>
                  <span
                    className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border ${
                      approvalStatus === "approved"
                        ? "bg-emerald-950/50 text-emerald-300 border-emerald-800/50"
                        : approvalStatus === "rejected"
                        ? "bg-rose-950/50 text-rose-300 border-rose-800/50"
                        : "bg-amber-950/40 text-amber-300 border-amber-800/40"
                    }`}
                  >
                    {approvalStatus.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Scope of modification */}
              {filesChanged.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[var(--text-secondary)] pt-1">
                  <span className="text-[var(--text-muted)]">Files to approve:</span>
                  {filesChanged.map((f, fi) => (
                    <span
                      key={fi}
                      className="px-2 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[#2DD4BF]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => handleApprove("approved")}
                  disabled={actionLoading === "approve" || approvalStatus === "approved"}
                  className="px-3.5 py-1.5 rounded-md bg-[#34D399] hover:bg-[#2fc47a] disabled:opacity-40 text-[#090A0B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Patch</span>
                </button>

                <button
                  onClick={() => handleApprove("rejected")}
                  disabled={actionLoading === "approve" || approvalStatus === "rejected"}
                  className="px-3.5 py-1.5 rounded-md bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Patch</span>
                </button>

                <button
                  onClick={() => setConfirmExportModal(true)}
                  disabled={approvalStatus !== "approved" || actionLoading === "export" || exported}
                  title={
                    approvalStatus !== "approved"
                      ? "Human approval is strictly required before exporting patch"
                      : "Export and apply verified patch to source workspace"
                  }
                  className="px-3.5 py-1.5 rounded-md bg-[var(--surface-3)] hover:bg-[var(--surface-2)] disabled:opacity-40 text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {exported ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{exported ? "Exported to Source" : "Apply & Export"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Sandbox Execution Results */}
          {sandboxResult && <SandboxResults result={sandboxResult} />}
        </section>
      )}

      {/* Confirmation Modal for Export */}
      {confirmExportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm patch export"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--surface-2)] text-[#2DD4BF] border border-[var(--border-subtle)]">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] font-sans">
                  Confirm Patch Export to Source
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  This action will apply the approved patch directly to the active working tree. The export event and resulting SHA-256 hash will be recorded in the cryptographic ledger.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setConfirmExportModal(false)}
                className="px-3.5 py-1.5 rounded-md bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExport}
                disabled={actionLoading === "export"}
                className="px-4 py-1.5 rounded-md bg-[var(--text-primary)] hover:opacity-90 text-[var(--bg-primary)] text-xs font-semibold flex items-center gap-1.5 transition-opacity"
              >
                {actionLoading === "export" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Confirm & Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
