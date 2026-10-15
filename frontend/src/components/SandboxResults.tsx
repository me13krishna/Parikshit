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
    <div className="border border-[#29313D] bg-[#0B0D12] rounded-xl overflow-hidden mt-4 shadow-xl">
      {/* Console Header */}
      <div className="px-4 py-2.5 bg-[#121720] border-b border-[#29313D] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#C6F36B]" />
          <span className="text-xs font-mono font-medium text-[#F4F6FA]">
            Sandbox Run: {result.run_id}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
              isSuccess
                ? "bg-emerald-950/60 text-[#39D98A] border-emerald-800/40"
                : "bg-rose-950/60 text-[#FB7185] border-rose-800/40"
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#C6F36B] hover:bg-[#b5e655] text-[#0B0D12] text-xs font-semibold transition-all shadow-sm"
          >
            {healing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Self-Heal Loop...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Trigger Self-Healing Loop</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Terminal Output */}
      <div className="p-4 bg-[#0B0D12] font-mono text-xs overflow-x-auto max-h-64 leading-relaxed text-[#F4F6FA]">
        <div className="text-[11px] text-[#5E697A] mb-2 select-none">
          $ {result.command}
        </div>
        <pre className="whitespace-pre-wrap">
          {result.stdout || result.stderr || "(No output produced)"}
        </pre>
      </div>

      {/* Self-Heal Results Banner */}
      {healResult && (
        <div className="p-4 border-t border-[#29313D] bg-[#121720] text-xs font-mono space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[#929BAA]">Self-Heal Loop Status:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded border ${
                healResult.verdict === "FIXED"
                  ? "bg-emerald-950 text-[#39D98A] border-emerald-800"
                  : "bg-amber-950 text-[#FBBF24] border-amber-800"
              }`}
            >
              {healResult.verdict}
            </span>
          </div>
          {healResult.iterations && (
            <div className="text-[11px] text-[#929BAA]">
              Completed {healResult.iterations.length} autonomous repair iteration(s) anchored in the cryptographic ledger.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
