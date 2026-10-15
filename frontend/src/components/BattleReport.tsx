"use client";

import React, { useState } from "react";
import {
  Swords,
  Play,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Hammer,
  UserCheck,
} from "lucide-react";
import { BattleReportData } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

interface BattleReportProps {
  taskId?: string;
  onError: (err: ApiClientError) => void;
}

export const BattleReport: React.FC<BattleReportProps> = ({ taskId, onError }) => {
  const [report, setReport] = useState<BattleReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [roundsToRun, setRoundsToRun] = useState<number>(2);
  const [activeStepText, setActiveStepText] = useState<string>("");

  const handleStartBattle = async () => {
    if (!taskId) return;
    setLoading(true);
    setActiveStepText("Initiating round 1: Adversary formulating edge-case attack vector...");
    try {
      const res = await api.runBattle(taskId, roundsToRun);
      setReport(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setLoading(false);
      setActiveStepText("");
    }
  };

  const renderSeverityBadge = (severity: string) => {
    const sev = severity.toLowerCase();
    if (sev === "high") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/60 font-semibold">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          <span>High Severity</span>
        </span>
      );
    }
    if (sev === "medium") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60 font-semibold">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>Medium Severity</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold">
        <Info className="w-3 h-3 text-emerald-400" />
        <span>Low Severity</span>
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header Context */}
      <div className="flex items-center justify-between pb-3 border-b border-[#29313D]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#191F2B] text-[#9390FB] border border-[#29313D]">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#F4F6FA] font-display">
              AI Code Battle Arena
            </h2>
            <p className="text-[11px] text-[#929BAA]">
              Adversarial multi-agent stress tests: Builder defends, Adversary attacks, Reviewer synthesizes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#F4F6FA] bg-[#121720] px-2.5 py-1 rounded-md border border-[#29313D]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9390FB]" />
          <span>Stage 3: Challenge</span>
        </div>
      </div>

      {/* Battle Trigger & Control Card */}
      <section className="rounded-xl bg-[#121720] border border-[#29313D] p-5 border-active-top flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-xs font-semibold text-[#F4F6FA] font-display">
            Multi-Agent Adversarial Challenge
          </h3>
          <p className="text-[11px] text-[#929BAA] mt-0.5">
            Builder Agent defends the patch; Adversary Agent writes ruthless stress tests; Reviewer Agent synthesizes residual risks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs text-[#929BAA]">
            <span>Rounds:</span>
            <select
              value={roundsToRun}
              onChange={(e) => setRoundsToRun(Number(e.target.value))}
              aria-label="Number of battle rounds"
              className="bg-[#0B0D12] border border-[#29313D] rounded-lg px-2.5 py-1 text-[#F4F6FA] text-xs focus:outline-none focus:border-[#C6F36B]"
            >
              <option value={1}>1 Round</option>
              <option value={2}>2 Rounds</option>
              <option value={3}>3 Rounds</option>
            </select>
          </div>

          <button
            onClick={handleStartBattle}
            disabled={!taskId || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9390FB] hover:bg-[#827ef5] disabled:opacity-50 text-[#0B0D12] text-xs font-semibold transition-all shadow-md shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0B0D12]" />
                <span>Simulating Battle...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Battle</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Screen Reader Announcement */}
      <div aria-live="polite" className="sr-only">
        {loading && (activeStepText || "Battle arena simulation in progress...")}
      </div>

      {/* Empty State before Battle (Required exact strings for EmptyStates.test.tsx) */}
      {!report && !loading && (
        <div className="p-10 text-center rounded-xl border border-[#29313D] bg-[#121720]/40 text-[#929BAA] text-xs space-y-3">
          <Swords className="w-8 h-8 text-[#9390FB] mx-auto opacity-60" />
          <div>
            <p className="font-semibold text-[#F4F6FA]">No battles executed yet.</p>
            <p className="text-[11px] text-[#5E697A] mt-1 max-w-md mx-auto">
              Run a battle to challenge this patch with adversarial stress tests before advancing to verification.
            </p>
          </div>
          {taskId && (
            <button
              onClick={handleStartBattle}
              className="px-4 py-2 rounded-lg bg-[#191F2B] hover:bg-[#222B3D] text-[#C6F36B] text-xs font-semibold border border-[#29313D] transition-colors"
            >
              Start Battle Challenge Now
            </button>
          )}
          {!taskId && (
            <p className="text-[11px] text-[#5E697A] font-mono">
              (Navigate to Stage 2: Build to create a task first.)
            </p>
          )}
        </div>
      )}

      {/* Battle Results Display */}
      {report && (
        <div className="space-y-5 animate-in fade-in">
          {/* Final Reviewer Verdict Card */}
          <section className="p-5 rounded-xl bg-[#121720] border border-[#29313D] flex flex-wrap items-center justify-between gap-4 border-active-top shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-[#0B0D12] text-[#C6F36B] border border-[#29313D]">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#5E697A]">
                  Reviewer Final Verdict
                </span>
                <div className="text-sm font-bold font-display text-[#F4F6FA] mt-0.5 flex items-center gap-2">
                  <span>{report.final_verdict?.toUpperCase() || "APPROVED"}</span>
                  <CheckCircle2 className="w-4 h-4 text-[#39D98A]" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {report.residual_risks?.length > 0 ? (
                <div className="text-amber-300 bg-amber-950/40 border border-amber-800/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{report.residual_risks.length} Residual Risk(s) Logged</span>
                </div>
              ) : (
                <div className="text-[#39D98A] bg-emerald-950/40 border border-emerald-800/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#39D98A]" />
                  <span>Zero High Risks</span>
                </div>
              )}

              {report.mode === "mock" && (
                <span className="text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded text-[10px]">
                  MOCK RUN
                </span>
              )}
            </div>
          </section>

          {/* Three Agent Lanes Legend */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-[#121720] border-l-4 border-l-[#C6F36B] border border-[#29313D]">
              <div className="font-semibold text-[#C6F36B] flex items-center gap-1.5">
                <Hammer className="w-3.5 h-3.5" />
                <span>Builder Agent</span>
              </div>
              <p className="text-[11px] text-[#929BAA] mt-0.5">
                Defends patch logic & executes fixes
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#121720] border-l-4 border-l-[#9390FB] border border-[#29313D]">
              <div className="font-semibold text-[#9390FB] flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                <span>Adversary Agent</span>
              </div>
              <p className="text-[11px] text-[#929BAA] mt-0.5">
                Attacks with edge tests & boundary traps
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#121720] border-l-4 border-l-[#39D98A] border border-[#29313D]">
              <div className="font-semibold text-[#39D98A] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reviewer Agent</span>
              </div>
              <p className="text-[11px] text-[#929BAA] mt-0.5">
                Synthesizes residual risks & issues verdict
              </p>
            </div>
          </div>

          {/* Round-by-Round Breakdown */}
          <div className="space-y-4">
            {report.rounds.map((rnd, idx) => (
              <section
                key={idx}
                className="rounded-xl border border-[#29313D] bg-[#121720] p-5 space-y-4 shadow-lg"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#29313D]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#C6F36B]">
                      Round #{rnd.round || idx + 1}
                    </span>
                    <span className="text-[11px] text-[#929BAA]">Adversarial Exchange</span>
                  </div>

                  <span
                    className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                      rnd.sandbox_exit_code === 0
                        ? "bg-emerald-950/60 text-[#39D98A] border-emerald-800/40"
                        : "bg-rose-950/60 text-[#FB7185] border-rose-800/40"
                    }`}
                  >
                    Sandbox: {rnd.sandbox_exit_code === 0 ? "Tests Passed" : "Challenge Failed"}
                  </span>
                </div>

                {/* 2-Column Split: Adversary Attack vs Reviewer Synthesis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Adversary Column */}
                  <div className="p-4 rounded-lg bg-[#0B0D12] border border-[#9390FB]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#9390FB] font-semibold text-xs flex items-center gap-1.5">
                        <Swords className="w-3.5 h-3.5" />
                        <span>Adversary Attack Vector</span>
                      </span>
                      {renderSeverityBadge(rnd.adversary_challenge.severity)}
                    </div>

                    <div className="text-xs font-semibold text-[#F4F6FA]">
                      {rnd.adversary_challenge.challenge_title}
                    </div>
                    <p className="text-[11px] text-[#929BAA] leading-relaxed">
                      {rnd.adversary_challenge.challenge_description}
                    </p>

                    {rnd.adversary_challenge.suggested_test && (
                      <div className="pt-2 border-t border-[#29313D] text-[10px] text-[#5E697A] font-mono">
                        Target test: <code>{rnd.adversary_challenge.suggested_test}</code>
                      </div>
                    )}
                  </div>

                  {/* Reviewer Column */}
                  <div className="p-4 rounded-lg bg-[#0B0D12] border border-[#39D98A]/30 space-y-2">
                    <span className="text-[#39D98A] font-semibold text-xs flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Reviewer Synthesis</span>
                    </span>

                    <p className="text-xs text-[#F4F6FA] leading-relaxed">
                      {rnd.reviewer_summary}
                    </p>

                    {rnd.residual_risks && rnd.residual_risks.length > 0 && (
                      <div className="pt-2 border-t border-[#29313D]">
                        <span className="text-[10px] font-mono text-[#5E697A] block mb-1">
                          Residual Risks:
                        </span>
                        <ul className="space-y-1 text-[11px] text-amber-300/90 font-sans">
                          {rnd.residual_risks.map((r, ri) => (
                            <li key={ri} className="flex items-start gap-1.5">
                              <span className="text-amber-400">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
