"use client";

import React, { useState } from "react";
import { AlertTriangle, X, ShieldAlert, Sparkles, Copy, Check } from "lucide-react";
import { HealthData } from "../lib/types";

interface BannerProps {
  health?: HealthData | null;
  error?: { message: string; code?: string; correlationId?: string; fixAdvice?: string } | null;
  onDismissError?: () => void;
}

export const Banner: React.FC<BannerProps> = ({ health, error, onDismissError }) => {
  const [copiedCid, setCopiedCid] = useState(false);
  const [dismissMock, setDismissMock] = useState(false);
  const [dismissUnsandboxed, setDismissUnsandboxed] = useState(false);

  const isMock = (health?.llm_provider === "mock" || health?.llm_mode === "mock") && !dismissMock;
  const isUnsandboxed =
    (health?.sandbox_mode === "host" ||
      health?.sandbox?.includes("local fallback") ||
      health?.sandbox?.includes("disabled")) &&
    !dismissUnsandboxed;

  const handleCopyCid = (cid: string) => {
    navigator.clipboard.writeText(cid);
    setCopiedCid(true);
    setTimeout(() => setCopiedCid(false), 2000);
  };

  return (
    <aside aria-label="System announcements" className="flex flex-col w-full z-30 select-none">
      {/* Mock Mode Slim Strip */}
      {isMock && (
        <div className="bg-[var(--surface-1)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] px-4 py-1.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#5E6AD2] shrink-0" />
            <span className="font-semibold tracking-wide uppercase px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]">
              DEMO / MOCK MODE
            </span>
            <span className="text-[var(--text-secondary)] text-[11px] hidden sm:inline">
              LLM responses and code generations are running in deterministic mock mode. Zero external API costs.
            </span>
          </div>
          <button
            onClick={() => setDismissMock(true)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded"
            title="Dismiss notification"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Unsandboxed Host Warning Slim Strip */}
      {isUnsandboxed && (
        <div className="bg-rose-950/30 border-b border-rose-900/40 text-rose-200 px-4 py-1.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-semibold tracking-wider uppercase px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px]">
              UNSANDBOXED HOST
            </span>
            <span className="text-rose-300/80 text-[11px] hidden sm:inline">
              Docker sandbox disabled. Test profiles run directly on the host in development fallback mode.
            </span>
          </div>
          <button
            onClick={() => setDismissUnsandboxed(true)}
            className="text-rose-400/80 hover:text-rose-200 p-0.5 rounded"
            title="Dismiss notification"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Active Error Toast (Actionable with error code, correlation_id, and copy action) */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mx-3 sm:mx-6 my-2 p-3 bg-[var(--surface-1)] border border-rose-800/40 rounded-xl shadow-xl text-rose-200 flex items-start justify-between gap-3 animate-in fade-in duration-200"
        >
          <div className="flex items-start gap-3 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5 text-xs">
              <div className="font-medium text-[var(--text-primary)] font-sans leading-snug">
                {error.message}
              </div>

              {/* Troubleshooting advice */}
              <div className="text-[11px] text-[var(--text-secondary)] font-sans">
                {error.fixAdvice ||
                  "Check network connectivity to localhost:8000 or re-ingest the demo project."}
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[var(--text-muted)] mt-1">
                {error.code && (
                  <span className="px-1.5 py-0.2 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] text-rose-300">
                    Code: <strong className="font-semibold">{error.code}</strong>
                  </span>
                )}
                {error.correlationId && (
                  <div className="flex items-center gap-1.5 px-1.5 py-0.2 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                    <span>
                      CID: <strong className="text-[var(--text-secondary)] font-semibold">{error.correlationId}</strong>
                    </span>
                    <button
                      onClick={() => handleCopyCid(error.correlationId!)}
                      aria-label="Copy correlation ID"
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      title="Copy correlation ID for tracing"
                    >
                      {copiedCid ? (
                        <Check className="w-3 h-3 text-[#34D399]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {onDismissError && (
            <button
              onClick={onDismissError}
              aria-label="Dismiss error"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--surface-2)] transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
