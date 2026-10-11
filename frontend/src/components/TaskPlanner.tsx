"use client";

import React, { useState } from "react";
import { Hammer, CheckCircle2, XCircle, Download, Play, Loader2 } from "lucide-react";
import { TaskItem, TaskPlan, SandboxResult } from "../lib/types";
import { api, ApiClientError } from "../lib/api";
import { DiffViewer } from "./DiffViewer";
import { SandboxResults } from "./SandboxResults";

interface TaskPlannerProps {
  projectId: string;
  onError: (err: ApiClientError) => void;
  onSandboxRunComplete?: (result: SandboxResult) => void;
}

export const TaskPlanner: React.FC<TaskPlannerProps> = ({ projectId, onError, onSandboxRunComplete }) => {
  const [requestText, setRequestText] = useState<string>("Implement robust multiply operation and unit tests");
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [plan, setPlan] = useState<TaskPlan | null>(null);
  const [diff, setDiff] = useState<string>("");
  const [filesChanged, setFilesChanged] = useState<string[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [sandboxResult, setSandboxResult] = useState<SandboxResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [exported, setExported] = useState<boolean>(false);

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

  // 2. Build Patch in Workspace
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

  // 4. Export / Apply
  const handleExport = async () => {
    if (!activeTask) return;
    setActionLoading("export");
    try {
      await api.exportTask(activeTask.id);
      setExported(true);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setActionLoading(null);
    }
  };

  // 5. Run Sandbox Checks
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
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Create Task Form */}
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-5 backdrop-blur-sm">
        <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider mb-2 font-mono flex items-center gap-2">
          <Hammer className="w-4 h-4 text-cyan-400" />
          <span>Task Planning & Vibe Builder</span>
        </h2>
        <form onSubmit={handleCreateTask} className="flex gap-2">
          <input
            type="text"
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="Describe the requested feature, bugfix, or refactor..."
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm shadow-cyan-950/40 shrink-0"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Plan Task</span>}
          </button>
        </form>
      </div>

      {/* Task & Plan Breakdown */}
      {activeTask && (
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-zinc-200">Task: {activeTask.id}</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                {activeTask.status}
              </span>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleBuild}
                disabled={actionLoading === "build"}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm shadow-indigo-950/40"
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
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition-colors"
              >
                {actionLoading === "sandbox" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Run Checks"}
              </button>
            </div>
          </div>

          {plan && (
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800/80 text-xs font-sans">
              <p className="text-zinc-300 font-medium mb-1.5">{plan.summary}</p>
              {plan.steps && (
                <ul className="space-y-1 text-zinc-400 text-[11px]">
                  {plan.steps.map((st, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="font-mono text-cyan-400">#{st.step || i + 1}</span>
                      <span>{st.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Diff Viewer */}
          {diff && <DiffViewer diff={diff} filesChanged={filesChanged} />}

          {/* Human Gate Section */}
          {diff && (
            <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400 font-semibold">Human Gate:</span>
                <span
                  className={`text-xs font-mono font-medium px-2 py-0.5 rounded border ${
                    approvalStatus === "approved"
                      ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
                      : approvalStatus === "rejected"
                      ? "bg-rose-950/60 text-rose-300 border-rose-800/40"
                      : "bg-amber-950/40 text-amber-300 border-amber-800/30"
                  }`}
                >
                  {approvalStatus.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove("approved")}
                  disabled={actionLoading === "approve" || approvalStatus === "approved"}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Patch</span>
                </button>

                <button
                  onClick={() => handleApprove("rejected")}
                  disabled={actionLoading === "approve" || approvalStatus === "rejected"}
                  className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={handleExport}
                  disabled={approvalStatus !== "approved" || actionLoading === "export" || exported}
                  title={
                    approvalStatus !== "approved"
                      ? "Human approval is strictly required before exporting patch"
                      : "Export and apply verified patch"
                  }
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm shadow-cyan-950/40"
                >
                  {exported ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{exported ? "Exported to Source" : "Apply & Export"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Sandbox Results */}
          {sandboxResult && <SandboxResults result={sandboxResult} />}
        </div>
      )}
    </div>
  );
};
