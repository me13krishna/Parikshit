"use client";

import React, { useState } from "react";
import {
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { SandboxResult, SandboxTestCase } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

interface AutonomousQAProps {
  taskId?: string;
  onError: (err: ApiClientError) => void;
  onSendToHeal?: (runId: string) => void;
}

interface ParsedTestItem {
  name: string;
  file: string;
  status: string;
  duration: string;
  message?: string;
}

export const AutonomousQA: React.FC<AutonomousQAProps> = ({
  taskId = "default",
  onError,
  onSendToHeal,
}) => {
  const [profile, setProfile] = useState<"pytest" | "pytest_coverage">("pytest");
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<SandboxResult | null>(null);

  const handleRunChecks = async () => {
    setRunning(true);
    try {
      const res = await api.runChecks(taskId, profile);
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setRunning(false);
    }
  };

  const isSuccess = result ? result.exit_code === 0 : null;

  // Derive real parsed test cases from sandbox execution results
  const parsedTests: ParsedTestItem[] = React.useMemo(() => {
    if (result?.tests && result.tests.length > 0) {
      return result.tests.map((t: SandboxTestCase) => {
        const parts = t.test_id.split("::");
        const file = parts[0] || "test.py";
        const name = parts[1] || t.test_id;
        return {
          name,
          file,
          status: t.outcome,
          duration: `${Math.max(1, Math.round(result.duration_ms / (result.tests?.length || 1)))}ms`,
          message: t.message,
        };
      });
    }
    if (result) {
      return [
        {
          name: result.exit_code === 0 ? "test_suite_execution" : "test_suite_failure",
          file: result.command,
          status: result.exit_code === 0 ? "passed" : "failed",
          duration: `${result.duration_ms}ms`,
          message: result.stderr || "Executed command in sandbox",
        },
      ];
    }
    return [];
  }, [result]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header Context */}
      <div className="flex items-center justify-between pb-3 border-b border-[#29313D]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#191F2B] text-[#39D98A] border border-[#29313D]">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#F4F6FA] font-display">
              Autonomous QA Engineer
            </h2>
            <p className="text-[11px] text-[#929BAA]">
              Isolated sandbox test execution, exit code verification, and reproduction evidence
            </p>
          </div>
        </div>

        {/* Profile and Run Controls */}
        <div className="flex items-center gap-2">
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as "pytest" | "pytest_coverage")}
            aria-label="Test execution profile"
            className="bg-[#121720] border border-[#29313D] rounded-lg px-2.5 py-1 text-[#F4F6FA] text-xs font-mono focus:outline-none focus:border-[#C6F36B]"
          >
            <option value="pytest">Profile: pytest (standard)</option>
            <option value="pytest_coverage">Profile: pytest with coverage</option>
          </select>

          <button
            onClick={handleRunChecks}
            disabled={running}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#C6F36B] hover:bg-[#b5e655] disabled:opacity-50 text-[#0B0D12] text-xs font-semibold transition-all shadow-sm"
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Sandbox...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Tests</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Suite Summary Banner */}
      {result && (
        <section className="p-4 rounded-xl bg-[#121720] border border-[#29313D] flex flex-wrap items-center justify-between gap-4 border-active-top shadow-xl">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg border ${
                isSuccess
                  ? "bg-emerald-950/40 text-[#39D98A] border-emerald-800/40"
                  : "bg-rose-950/50 text-[#FB7185] border-rose-800/50"
              }`}
            >
              {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-[#F4F6FA]">
                  {isSuccess ? "All Test Assertions Passed" : "Test Execution Failed"}
                </span>
                <span
                  className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                    isSuccess
                      ? "bg-emerald-950/60 text-[#39D98A]"
                      : "bg-rose-950/60 text-[#FB7185]"
                  }`}
                >
                  Exit Code: {result.exit_code}
                </span>
              </div>
              <p className="text-[11px] text-[#929BAA] mt-0.5">
                Run ID: <code className="font-mono text-[#F4F6FA]">{result.run_id}</code> • Duration: {result.duration_ms}ms
              </p>
            </div>
          </div>

          {!isSuccess && onSendToHeal && (
            <button
              onClick={() => onSendToHeal(result.run_id)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#191F2B] hover:bg-[#222B3D] border border-[#C6F36B]/50 text-[#C6F36B] text-xs font-semibold transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Send to Self-Healing Loop</span>
            </button>
          )}
        </section>
      )}

      {/* Main Testing Display */}
      <div className="grid grid-cols-1 gap-4">
        {/* Console / Output View */}
        <section className="rounded-xl border border-[#29313D] bg-[#121720] overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 bg-[#0B0D12] border-b border-[#29313D] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#F4F6FA]">
              <Terminal className="w-3.5 h-3.5 text-[#C6F36B]" />
              <span>Sandbox Console Log</span>
            </div>

            {result && (
              <span className="text-[11px] font-mono text-[#5E697A]">
                Command: {result.command}
              </span>
            )}
          </div>

          {result ? (
            <div className="p-4 bg-[#0B0D12] font-mono text-xs overflow-x-auto max-h-80 leading-relaxed text-[#F4F6FA]">
              <pre className="whitespace-pre-wrap">
                {result.stdout || result.stderr || "No terminal output produced."}
              </pre>
            </div>
          ) : (
            <div className="p-12 text-center text-[#5E697A] text-xs font-sans space-y-2">
              <Terminal className="w-8 h-8 text-[#5E697A] mx-auto opacity-50" />
              <p>No tests executed in this session yet.</p>
              <p className="text-[11px] text-[#929BAA]">
                Click &ldquo;Run Tests&rdquo; above to execute the test suite in the isolated sandbox runner.
              </p>
            </div>
          )}
        </section>

        {/* Test Case Breakdown Table */}
        {result && (
          <section className="rounded-xl border border-[#29313D] bg-[#121720] p-4 space-y-3">
            <span className="text-xs font-mono font-semibold text-[#F4F6FA] block">
              Executed Test Cases
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#29313D] text-[#5E697A] text-[10px] uppercase">
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Test Case</th>
                    <th className="pb-2">File</th>
                    <th className="pb-2 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#29313D]">
                  {parsedTests.map((tc, idx) => (
                    <tr key={idx} className="hover:bg-[#191F2B]/40 transition-colors">
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            tc.status === "passed"
                              ? "bg-emerald-950/40 text-[#39D98A]"
                              : "bg-rose-950/40 text-[#FB7185]"
                          }`}
                        >
                          {tc.status === "passed" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{tc.status}</span>
                        </span>
                      </td>
                      <td className="py-2.5 text-[#F4F6FA] font-medium">{tc.name}</td>
                      <td className="py-2.5 text-[#929BAA]">{tc.file}</td>
                      <td className="py-2.5 text-[#5E697A] text-right">{tc.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
