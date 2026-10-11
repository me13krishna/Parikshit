"use client";

import React from "react";
import { AlertTriangle, X, ShieldAlert, Sparkles } from "lucide-react";
import { HealthData } from "../lib/types";

interface BannerProps {
  health?: HealthData | null;
  error?: { message: string; code?: string; correlationId?: string } | null;
  onDismissError?: () => void;
}

export const Banner: React.FC<BannerProps> = ({ health, error, onDismissError }) => {
  const isMock = health?.llm_provider === "mock" || health?.llm_mode === "mock";
  const isUnsandboxed = health?.sandbox_mode === "host" || health?.sandbox?.includes("local fallback") || health?.sandbox?.includes("disabled");

  return (
    <aside aria-label="System announcements" className="flex flex-col gap-2 w-full">
      {/* Mock Mode Banner */}
      {isMock && (
        <div className="bg-amber-950/70 border-b border-amber-600/40 text-amber-200 px-4 py-2 flex items-center justify-between text-xs font-mono shadow-inner backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
              DEMO / MOCK MODE
            </span>
            <span className="text-amber-300/90 hidden sm:inline">
              LLM responses and code generations are running in deterministic mock mode. Zero external API costs.
            </span>
          </div>
          <span className="text-amber-400/80 text-[10px]">provider: mock</span>
        </div>
      )}

      {/* Unsandboxed Host Warning */}
      {isUnsandboxed && (
        <div className="bg-rose-950/60 border-b border-rose-600/40 text-rose-200 px-4 py-1.5 flex items-center justify-between text-xs font-mono backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[10px]">
              UNSANDBOXED HOST
            </span>
            <span className="text-rose-300/80 text-[11px] hidden sm:inline">
              Docker sandbox is disabled. Executing test profiles directly on host runner in development mode.
            </span>
          </div>
        </div>
      )}

      {/* Active Error Toast */}
      {error && (
        <div
          role="alert"
          className="mx-4 mt-2 p-3 bg-red-950/90 border border-red-700/60 rounded-lg shadow-xl text-red-200 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="font-semibold text-red-100">{error.message}</span>
              <div className="flex items-center gap-2 font-mono text-[11px] text-red-400/90">
                {error.code && (
                  <span>
                    Code: <strong className="text-red-300">{error.code}</strong>
                  </span>
                )}
                {error.correlationId && (
                  <span>
                    CID: <strong className="text-red-300">{error.correlationId}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
          {onDismissError && (
            <button
              onClick={onDismissError}
              aria-label="Dismiss error"
              className="text-red-400 hover:text-red-100 p-1 rounded hover:bg-red-900/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
