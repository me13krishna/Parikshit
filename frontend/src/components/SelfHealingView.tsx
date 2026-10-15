"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Loader2,
  Bug,
  FileCode,
  Check,
} from "lucide-react";
import { HealResult } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

interface SelfHealingViewProps {
  initialRunId?: string;
  onError: (err: ApiClientError) => void;
}

export const SelfHealingView: React.FC<SelfHealingViewProps> = ({
  initialRunId = "run_baseline_01",
  onError,
}) => {
  const [runId, setRunId] = useState<string>(initialRunId);
  const [healing, setHealing] = useState<boolean>(false);
  const [result, setResult] = useState<HealResult | null>(null);

  const STAGES = [
    { name: "Detect Issue", desc: "Extract stack trace & failing assertions" },
    { name: "Investigate Cause", desc: "Rank hypotheses via AST call graph" },
    { name: "Propose Patch", desc: "Synthesize targeted fix for invariants" },
    { name: "Rerun Failing Test", desc: "Execute in isolated Docker sandbox" },
    { name: "Verify Result", desc: "Seal cryptographic proof in ledger" },
  ];

  const handleTriggerHeal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHealing(true);
    try {
      const res = await api.triggerSelfHeal(runId, 2);
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setHealing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header Context */}
      <div className="flex items-center justify-between pb-3 border-b border-[#29313D]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#191F2B] text-[#C6F36B] border border-[#29313D]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#F4F6FA] font-display">
              Self-Healing Development Loop
            </h2>
            <p className="text-[11px] text-[#929BAA]">
              Continuous closed-loop debugging: detect, diagnose, patch, retest, and verify
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#F4F6FA] bg-[#121720] px-2.5 py-1 rounded-md border border-[#29313D]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C6F36B]" />
          <span>Closed Loop Ready</span>
        </div>
      </div>

      {/* 5-Step Debugging Lifecycle Bar */}
      <section className="p-5 rounded-xl bg-[#121720] border border-[#29313D] border-active-top shadow-xl">
        <h3 className="text-xs font-semibold text-[#F4F6FA] mb-4 font-display">
          Debugging Lifecycle Workflow
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {STAGES.map((st, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#C6F36B] font-bold">
                  Step 0{i + 1}
                </span>
                {result && <Check className="w-3 h-3 text-[#39D98A]" />}
              </div>
              <div className="text-xs font-semibold text-[#F4F6FA]">{st.name}</div>
              <p className="text-[10px] text-[#929BAA] leading-tight">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trigger Card */}
      <section className="p-5 rounded-xl bg-[#121720] border border-[#29313D] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-[#F4F6FA] font-display">
              Autonomous Repair Runner
            </h3>
            <p className="text-[11px] text-[#929BAA]">
              Provide baseline test run ID or trigger autonomous repair of the active failure.
            </p>
          </div>

          <form onSubmit={handleTriggerHeal} className="flex items-center gap-2">
            <input
              type="text"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              placeholder="Failing Run ID (e.g. run_baseline_01)"
              className="px-3 py-1.5 rounded-lg bg-[#0B0D12] border border-[#29313D] text-xs font-mono text-[#F4F6FA] focus:outline-none focus:border-[#C6F36B]"
            />
            <button
              type="submit"
              disabled={healing || !runId.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-[#C6F36B] hover:bg-[#b5e655] disabled:opacity-50 text-[#0B0D12] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              {healing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Iterating Self-Heal...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Diagnose & Heal</span>
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Repair Evidence Results */}
      {result ? (
        <div className="space-y-4 animate-in fade-in">
          {/* Final Verdict Banner */}
          <section className="p-4 rounded-xl bg-[#121720] border border-[#29313D] flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg border ${
                  result.verdict === "FIXED"
                    ? "bg-emerald-950/40 text-[#39D98A] border-emerald-800/40"
                    : "bg-amber-950/40 text-[#FBBF24] border-amber-800/40"
                }`}
              >
                {result.verdict === "FIXED" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#F4F6FA]">
                    Autonomous Repair Result:
                  </span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      result.verdict === "FIXED"
                        ? "bg-emerald-950 text-[#39D98A]"
                        : "bg-amber-950 text-[#FBBF24]"
                    }`}
                  >
                    {result.verdict}
                  </span>
                </div>
                <p className="text-[11px] text-[#929BAA] mt-0.5">
                  Heal ID: <code className="font-mono text-[#F4F6FA]">{result.heal_id}</code> • Baseline: {result.baseline_run_id}
                </p>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#39D98A] hidden sm:block">
              Recorded in SHA-256 Ledger
            </div>
          </section>

          {/* Iteration Timeline */}
          <section className="p-5 rounded-xl bg-[#121720] border border-[#29313D] space-y-4 shadow-xl">
            <h4 className="text-xs font-mono font-semibold text-[#F4F6FA] uppercase tracking-wider">
              Repair Iteration History ({result.iterations?.length || 0})
            </h4>

            <div className="space-y-3">
              {result.iterations?.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#C6F36B]">
                      Iteration #{it.attempt_number || idx + 1}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        it.verdict === "FIXED"
                          ? "bg-emerald-950 text-[#39D98A]"
                          : "bg-amber-950 text-[#FBBF24]"
                      }`}
                    >
                      {it.verdict}
                    </span>
                  </div>

                  <div className="text-xs text-[#F4F6FA]">
                    <strong>Hypothesis:</strong> {it.hypothesis}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#929BAA]">
                    <FileCode className="w-3.5 h-3.5 text-[#5E697A]" />
                    <span>Target: {it.target_file}</span>
                    <span>• Exit Code: {it.exit_code}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="p-12 text-center text-[#5E697A] text-xs font-sans rounded-xl bg-[#121720]/40 border border-[#29313D] space-y-2">
          <Bug className="w-8 h-8 text-[#5E697A] mx-auto opacity-50" />
          <p>No active self-healing diagnosis initiated yet.</p>
          <p className="text-[11px] text-[#929BAA]">
            Enter a failing test run ID above and click &ldquo;Diagnose & Heal&rdquo; to execute the repair cycle.
          </p>
        </div>
      )}
    </div>
  );
};
