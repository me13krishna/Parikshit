"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import { HealthData, LedgerVerifyResult } from "../lib/types";

interface HeaderProps {
  health: HealthData | null;
  projectName?: string;
  revisionId?: string;
  ledgerStatus?: LedgerVerifyResult | null;
  onRefreshHealth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  projectName = "Demo Project",
  revisionId,
  ledgerStatus,
  onRefreshHealth
}) => {
  const isHealthy = health?.status === "ok";
  const isLedgerValid = ledgerStatus ? ledgerStatus.valid : true;

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <span className="font-mono font-bold text-white text-base">P</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-zinc-100 tracking-tight">PARIKSHIT</h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                v{health?.version || "2.0.0"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Grounded AI Engineering Teammate</p>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-zinc-800 hidden md:block" />

        {/* Project & Revision Selector */}
        <div className="hidden md:flex items-center gap-2 font-mono text-xs">
          <span className="text-zinc-500">Project:</span>
          <span className="text-zinc-200 font-medium px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            {projectName}
          </span>
          {revisionId && (
            <>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400 text-[11px] truncate max-w-[140px]" title={revisionId}>
                rev_{revisionId.slice(-8)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* System Telemetry & Badges */}
      <div className="flex items-center gap-3">
        {/* Ledger Hash Chain Status Badge */}
        <div
          data-testid="ledger-badge"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
            isLedgerValid
              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
              : "bg-red-950/60 text-red-300 border-red-700/60 animate-pulse"
          }`}
          title={
            isLedgerValid
              ? "Cryptographic Ledger Verified: All hash chains intact"
              : `Ledger Broken at Sequence #${ledgerStatus?.broken_at_sequence ?? "unknown"}`
          }
        >
          {isLedgerValid ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className="hidden sm:inline font-medium">
            {isLedgerValid ? "Chain Verified" : "Chain Broken"}
          </span>
        </div>

        {/* Health status badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono">
          <div
            className={`w-2 h-2 rounded-full ${
              isHealthy ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-amber-500"
            }`}
          />
          <span className="text-zinc-400 hidden lg:inline">
            {health?.llm_provider || "mock"} / {health?.sandbox_mode || "host"}
          </span>
        </div>

        {onRefreshHealth && (
          <button
            onClick={onRefreshHealth}
            aria-label="Refresh telemetry health"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
