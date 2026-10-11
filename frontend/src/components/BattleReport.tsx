"use client";

import React, { useState } from "react";
import { Swords, Play, Loader2, UserCheck } from "lucide-react";
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

  const handleStartBattle = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await api.runBattle(taskId, roundsToRun);
      setReport(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header & Battle Trigger */}
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-5 backdrop-blur-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider font-mono">
              AI vs AI Battle Arena
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Builder Agent writes code; Adversary Agent writes ruthless stress tests; Reviewer synthesizes residual risks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400">
            <span>Rounds:</span>
            <select
              value={roundsToRun}
              onChange={(e) => setRoundsToRun(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-xs"
            >
              <option value={1}>1 Round</option>
              <option value={2}>2 Rounds</option>
              <option value={3}>3 Rounds</option>
            </select>
          </div>

          <button
            onClick={handleStartBattle}
            disabled={!taskId || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white text-xs font-semibold shadow-md shadow-indigo-950/40 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Simulating Battle Arena...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Multi-Round Battle</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!taskId && (
        <div className="p-8 text-center border border-zinc-800 bg-zinc-900/20 rounded-xl text-zinc-500 text-xs font-mono">
          Please select or build a task first before starting an AI-vs-AI Battle.
        </div>
      )}

      {/* Battle Results */}
      {report && (
        <div className="space-y-6">
          {/* Final Verdict Banner */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-xs text-zinc-400 font-mono">Final Reviewer Verdict:</span>
                <div className="text-sm font-semibold text-zinc-100 font-mono mt-0.5">
                  {report.final_verdict?.toUpperCase() || "APPROVED"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {report.residual_risks?.length > 0 && (
                <div className="text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-3 py-1 rounded-full">
                  {report.residual_risks.length} Residual Risk(s) Flagged
                </div>
              )}
              {report.mode === "mock" && (
                <div className="text-[10px] font-mono text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded">
                  MOCK RUN
                </div>
              )}
            </div>
          </div>

          {/* Round-by-Round Arena Cards */}
          <div className="space-y-4">
            {report.rounds.map((rnd, idx) => (
              <div key={idx} className="border border-zinc-800 bg-zinc-950 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <span className="text-xs font-mono font-semibold text-cyan-400 uppercase">
                    Round #{rnd.round || idx + 1}
                  </span>
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

                {/* Side-by-Side: Adversary Challenge vs Reviewer Synthesis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Adversary Column */}
                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-rose-400 font-semibold uppercase text-[10px]">
                        Adversary Attack Vector
                      </span>
                      <span
                        className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                          rnd.adversary_challenge.severity === "high"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : "bg-amber-950 text-amber-300 border border-amber-800"
                        }`}
                      >
                        {rnd.adversary_challenge.severity}
                      </span>
                    </div>
                    <p className="text-zinc-200 font-semibold">{rnd.adversary_challenge.challenge_title}</p>
                    <p className="text-zinc-400 text-[11px] font-sans">
                      {rnd.adversary_challenge.challenge_description}
                    </p>
                    {rnd.adversary_challenge.suggested_test && (
                      <div className="pt-2 text-[10px] text-zinc-500">
                        Test file: <code>{rnd.adversary_challenge.suggested_test}</code>
                      </div>
                    )}
                  </div>

                  {/* Reviewer Column */}
                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs space-y-2 font-mono">
                    <span className="text-indigo-400 font-semibold uppercase text-[10px]">
                      Reviewer Synthesis
                    </span>
                    <p className="text-zinc-200 font-sans text-xs">{rnd.reviewer_summary}</p>

                    {rnd.residual_risks && rnd.residual_risks.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] text-zinc-500 block mb-1">Residual Risks:</span>
                        <ul className="list-disc list-inside text-[11px] text-amber-300/90 space-y-0.5 font-sans">
                          {rnd.residual_risks.map((r, ri) => (
                            <li key={ri}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
