"use client";

import React, { useState } from "react";
import { Terminal, Sparkles, Loader2 } from "lucide-react";
import { SandboxResult, HealResult } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

interface SandboxResultsProps {
  result: SandboxResult;
  onHealComplete?: (heal: HealResult) => void;
  onError?: (err: ApiClientError) => void;
}

export const SandboxResults: React.FC<SandboxResultsProps> = ({
  result,
  onHealComplete,
  onError,
}) => {
  const [healing, setHealing] = useState<boolean>(false);
  const [healResult, setHealResult] = useState<HealResult | null>(null);

  const isSuccess = result.exit_code === 0;

  const handleSelfHeal = async () => {
    setHealing(true);
    try {
      const heal = await api.triggerSelfHeal(result.run_id, 2);
      setHealResult(heal);
      if (onHealComplete) onHealComplete(heal);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && onError) {
        onError(err);
      }
    } finally {
      setHealing(false);
    }
  };

  return (
    <div className="border border-[rgba(159,176,204,0.18)] bg-[var(--color-ink-950)] rounded-xl overflow-hidden mt-4 shadow-xl">
      {/* Console Header */}
      <div className="px-4 py-2.5 bg-[var(--color-ink-900)] border-b border-[rgba(159,176,204,0.12)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--color-cyan-300)]" />
          <span className="text-xs font-mono font-medium text-[var(--color-text-100)]">
            Sandbox Run: {result.run_id}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
              isSuccess
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
                : "bg-rose-950/60 text-rose-300 border-rose-800/40"
            }`}
          >
            Exit Code {result.exit_code} ({isSuccess ? "Passed" : "Failed"})
          </span>
        </div>

        {/* Self-Healing Trigger on Failure */}
        {!isSuccess && (
          <button
            onClick={handleSelfHeal}
            disabled={healing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--color-blue-500)] hover:bg-[var(--color-sky-400)] text-white text-xs font-medium transition-all shadow-sm"
          >
            {healing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Self-Heal Loop...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Trigger Self-Healing Loop</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Terminal Output */}
      <div className="p-4 bg-[var(--color-ink-950)] font-mono text-xs overflow-x-auto max-h-64 leading-relaxed text-[var(--color-text-100)]">
        <div className="text-[11px] text-[var(--color-text-500)] mb-2 select-none">
          $ {result.command}
        </div>
        <pre className="whitespace-pre-wrap">
          {result.stdout || result.stderr || "(No output produced)"}
        </pre>
      </div>

      {/* Self-Heal Results Banner */}
      {healResult && (
        <div className="p-4 border-t border-[rgba(159,176,204,0.12)] bg-[var(--color-ink-900)] text-xs font-mono space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-500)]">Self-Heal Loop Status:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded border ${
                healResult.verdict === "FIXED"
                  ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                  : "bg-amber-950 text-amber-300 border-amber-800"
              }`}
            >
              {healResult.verdict}
            </span>
          </div>
          {healResult.iterations && (
            <div className="text-[11px] text-[var(--color-text-300)]">
              Completed {healResult.iterations.length} autonomous repair iteration(s) anchored in the cryptographic ledger.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
