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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Context */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(159,176,204,0.12)]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[rgba(147,144,251,0.12)] text-[var(--color-violet-400)]">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-text-100)] font-display">
              Stage 3: Challenge
            </h2>
            <p className="text-[11px] text-[var(--color-text-500)]">
              Multi-agent stress tests: Builder, Adversary, and Reviewer lanes
            </p>
          </div>
        </div>
      </div>

      {/* Battle Trigger & Control Card */}
      <section className="rounded-2xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.16)] p-5 border-active-top flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-text-100)] font-display">
            AI vs AI Battle Arena
          </h3>
          <p className="text-[11px] text-[var(--color-text-300)] mt-0.5">
            Builder Agent defends the patch; Adversary Agent writes ruthless stress tests; Reviewer Agent synthesizes residual risks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-text-300)]">
            <span>Rounds:</span>
            <select
              value={roundsToRun}
              onChange={(e) => setRoundsToRun(Number(e.target.value))}
              aria-label="Number of battle rounds"
              className="bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.2)] rounded-lg px-2.5 py-1 text-[var(--color-text-100)] text-xs focus:ring-2 focus:ring-[var(--color-cyan-300)] focus:outline-none"
            >
              <option value={1}>1 Round</option>
              <option value={2}>2 Rounds</option>
              <option value={3}>3 Rounds</option>
            </select>
          </div>

          <button
            onClick={handleStartBattle}
            disabled={!taskId || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-violet-400)] hover:bg-[var(--color-violet-400)]/80 disabled:bg-[var(--color-ink-800)] text-[var(--color-ink-950)] text-xs font-semibold transition-all shadow-md shadow-[rgba(147,144,251,0.25)] shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[var(--color-ink-950)]" />
                <span>Simulating Multi-Agent Battle...</span>
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

      {/* Screen Reader Live Progress Announcement */}
      <div aria-live="polite" className="sr-only">
        {loading && (activeStepText || "Battle arena simulation in progress...")}
      </div>

      {/* Empty State before Battle */}
      {!report && !loading && (
        <div className="p-8 text-center rounded-2xl border border-[rgba(159,176,204,0.12)] bg-[var(--color-ink-900)]/40 text-[var(--color-text-500)] text-xs space-y-3">
          <Swords className="w-8 h-8 text-[var(--color-violet-400)] mx-auto opacity-60" />
          <div>
            <p className="font-semibold text-[var(--color-text-100)]">No battles executed yet.</p>
            <p className="text-[11px] text-[var(--color-text-300)] mt-1 max-w-md mx-auto">
              Run a battle to challenge this patch with adversarial stress tests before advancing to verification.
            </p>
          </div>
          {taskId && (
            <button
              onClick={handleStartBattle}
              className="px-4 py-2 rounded-xl bg-[var(--color-ink-800)] hover:bg-[var(--color-ink-800)]/80 text-[var(--color-cyan-300)] text-xs font-medium border border-[rgba(106,215,250,0.3)] transition-colors"
            >
              Start Battle Challenge Now
            </button>
          )}
          {!taskId && (
            <p className="text-[11px] text-[var(--color-text-500)] font-mono">
              (Navigate to Stage 2: Change to create and build a task first.)
            </p>
          )}
        </div>
      )}

      {/* Battle Results Display */}
      {report && (
        <div className="space-y-6">
          {/* Prominent Final Reviewer Verdict Card */}
          <section className="p-5 rounded-2xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.2)] flex flex-wrap items-center justify-between gap-4 border-active-top shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-[rgba(106,215,250,0.12)] text-[var(--color-cyan-300)]">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[var(--color-text-500)]">
                  Reviewer Final Verdict
                </span>
                <div className="text-base font-bold font-display text-[var(--color-text-100)] mt-0.5 flex items-center gap-2">
                  <span>{report.final_verdict?.toUpperCase() || "APPROVED"}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
                <div className="text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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
            <div className="p-3 rounded-xl bg-[var(--color-ink-900)] border-l-4 border-l-[var(--color-blue-500)] border border-[rgba(159,176,204,0.1)]">
              <div className="font-semibold text-[var(--color-blue-500)] flex items-center gap-1.5">
                <Hammer className="w-3.5 h-3.5" />
                <span>Builder Agent</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-500)] mt-0.5">
                Defends patch logic & executes fixes
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-ink-900)] border-l-4 border-l-[var(--color-violet-400)] border border-[rgba(159,176,204,0.1)]">
              <div className="font-semibold text-[var(--color-violet-400)] flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                <span>Adversary Agent</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-500)] mt-0.5">
                Attacks with edge tests & boundary traps
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-ink-900)] border-l-4 border-l-[var(--color-cyan-300)] border border-[rgba(159,176,204,0.1)]">
              <div className="font-semibold text-[var(--color-cyan-300)] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reviewer Agent</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-500)] mt-0.5">
                Synthesizes residual risks & issues verdict
              </p>
            </div>
          </div>

          {/* Round-by-Round Breakdown */}
          <div className="space-y-4">
            {report.rounds.map((rnd, idx) => (
              <section
                key={idx}
                className="rounded-2xl border border-[rgba(159,176,204,0.16)] bg-[var(--color-ink-950)] p-5 space-y-4 shadow-lg"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[rgba(159,176,204,0.12)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--color-cyan-300)]">
                      Round #{rnd.round || idx + 1}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-500)]">Arena Exchange</span>
                  </div>

                  <span
                    className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                      rnd.sandbox_exit_code === 0
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
                        : "bg-rose-950/60 text-rose-300 border-rose-800/40"
                    }`}
                  >
                    Sandbox: {rnd.sandbox_exit_code === 0 ? "Tests Passed" : "Challenge Failed"}
                  </span>
                </div>

                {/* 2-Column Split: Adversary Attack vs Reviewer Synthesis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Adversary Column (violet-400 theme) */}
                  <div className="p-4 rounded-xl bg-[var(--color-ink-900)] border border-[rgba(147,144,251,0.25)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-violet-400)] font-semibold text-xs flex items-center gap-1.5">
                        <Swords className="w-3.5 h-3.5" />
                        <span>Adversary Attack Vector</span>
                      </span>
                      {renderSeverityBadge(rnd.adversary_challenge.severity)}
                    </div>

                    <div className="text-xs font-semibold text-[var(--color-text-100)]">
                      {rnd.adversary_challenge.challenge_title}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-300)] leading-relaxed">
                      {rnd.adversary_challenge.challenge_description}
                    </p>

                    {rnd.adversary_challenge.suggested_test && (
                      <div className="pt-2 border-t border-[rgba(159,176,204,0.1)] text-[10px] text-[var(--color-text-500)] font-mono">
                        Target test: <code>{rnd.adversary_challenge.suggested_test}</code>
                      </div>
                    )}
                  </div>

                  {/* Reviewer Column (cyan-300 theme) */}
                  <div className="p-4 rounded-xl bg-[var(--color-ink-900)] border border-[rgba(106,215,250,0.25)] space-y-2.5">
                    <span className="text-[var(--color-cyan-300)] font-semibold text-xs flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Reviewer Synthesis</span>
                    </span>

                    <p className="text-xs text-[var(--color-text-100)] leading-relaxed">
                      {rnd.reviewer_summary}
                    </p>

                    {rnd.residual_risks && rnd.residual_risks.length > 0 && (
                      <div className="pt-2 border-t border-[rgba(159,176,204,0.1)]">
                        <span className="text-[10px] font-mono text-[var(--color-text-500)] block mb-1">
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
