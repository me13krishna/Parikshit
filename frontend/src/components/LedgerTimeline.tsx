"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Download,
  RefreshCw,
  Hash,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
} from "lucide-react";
import { LedgerEntry, LedgerVerifyResult } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

interface LedgerTimelineProps {
  projectId?: string;
  onError: (err: ApiClientError) => void;
  onVerifyChange?: (res: LedgerVerifyResult) => void;
}

export const LedgerTimeline: React.FC<LedgerTimelineProps> = ({
  projectId,
  onError,
  onVerifyChange,
}) => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [verifyStatus, setVerifyStatus] = useState<LedgerVerifyResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await api.getLedgerEntries(projectId, 50);
        if (!ignore) setEntries(data || []);
        const v = await api.verifyLedger(projectId);
        if (!ignore) {
          setVerifyStatus(v);
          if (onVerifyChange) onVerifyChange(v);
        }
      } catch (err: unknown) {
        if (!ignore && err instanceof ApiClientError) onError(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    loadData();
    return () => {
      ignore = true;
    };
  }, [projectId, onError, onVerifyChange]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyLedger(projectId);
      setVerifyStatus(res);
      if (onVerifyChange) onVerifyChange(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleDownloadEvidencePack = async () => {
    try {
      const pack = await api.getEvidencePack(projectId);
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parikshit-evidence-pack-${projectId || "global"}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    }
  };

  const isValid = verifyStatus?.valid ?? true;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Context */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(159,176,204,0.12)]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[rgba(173,129,219,0.15)] text-[var(--color-lavender-300)]">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-text-100)] font-display">
              Stage 5: Prove
            </h2>
            <p className="text-[11px] text-[var(--color-text-500)]">
              Cryptographic SHA-256 hash ledger, block chain verification, and evidence packs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-ink-800)] hover:bg-[var(--color-ink-800)]/80 text-[var(--color-text-100)] text-xs font-mono border border-[rgba(159,176,204,0.16)] transition-colors"
          >
            {verifying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-[var(--color-cyan-300)]" />
            )}
            <span>Verify Integrity</span>
          </button>

          <button
            onClick={handleDownloadEvidencePack}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--color-blue-500)] hover:bg-[var(--color-sky-400)] text-white text-xs font-semibold shadow-md shadow-[rgba(7,108,211,0.25)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Evidence Pack</span>
          </button>
        </div>
      </div>

      {/* Verification Status Card (data-testid="ledger-verification-panel" for tests) */}
      <section
        data-testid="ledger-verification-panel"
        className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-lg ${
          isValid
            ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
            : "bg-red-950/50 border-red-700/60 text-red-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {isValid ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse shrink-0" />
          )}
          <div>
            <span className="font-bold">
              {isValid
                ? "Cryptographic Chain Verified: Intact"
                : `CHAIN BROKEN at Sequence #${verifyStatus?.broken_at_sequence ?? "unknown"}!`}
            </span>
            <div className="text-[11px] text-[var(--color-text-300)] mt-0.5 font-sans">
              {isValid
                ? `All ${entries.length} local entries match SHA-256 forward and backward links.`
                : `Tampering detected in database rows: ${verifyStatus?.error}`}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[var(--color-text-500)] font-sans hidden sm:block">
          Audit of {entries.length} chained entries
        </div>
      </section>

      {/* Block Chain Timeline */}
      <section className="rounded-2xl border border-[rgba(159,176,204,0.16)] bg-[var(--color-ink-900)] overflow-hidden shadow-2xl border-active-top">
        <div className="px-5 py-3 bg-[var(--color-ink-950)]/70 border-b border-[rgba(159,176,204,0.12)] text-xs font-mono text-[var(--color-text-300)] flex items-center justify-between">
          <span>Ledger History ({entries.length} Cryptographic Events)</span>
          <span className="text-[10px] text-[var(--color-text-500)] flex items-center gap-1">
            <Lock className="w-3 h-3 text-[var(--color-cyan-300)]" />
            <span>SHA-256 Linked</span>
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[var(--color-text-500)] text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--color-teal-400)]" />
            <span>Auditing cryptographic blockchain entries...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-500)] text-xs font-sans space-y-2">
            <p>No entries recorded yet.</p>
            <p className="text-[11px] text-[var(--color-text-300)]">
              Ingest a project or execute a task to initialize the proof chain.
            </p>
          </div>
        ) : (
          <div className="relative p-4 sm:p-6 space-y-4">
            {/* Visual connecting gradient chain line */}
            <div
              className="absolute left-[29px] sm:left-[37px] top-8 bottom-8 w-[2px] opacity-40 select-none pointer-events-none"
              style={{ background: "var(--grad-ring)" }}
            />

            {entries.map((ent) => {
              const isExpanded = expandedId === ent.id;
              return (
                <div
                  key={ent.id}
                  className="relative flex items-start gap-3 sm:gap-4 group"
                >
                  {/* Sequence Node Circle */}
                  <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.25)] flex items-center justify-center font-mono text-[11px] font-bold text-[var(--color-cyan-300)] group-hover:border-[var(--color-cyan-300)] transition-colors shadow-md shrink-0">
                    #{ent.sequence}
                  </div>

                  {/* Block Card */}
                  <div className="flex-1 rounded-xl bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.14)] p-3.5 transition-all hover:border-[rgba(159,176,204,0.28)] shadow-sm">
                    <div
                      className="flex items-center justify-between cursor-pointer select-none"
                      onClick={() => setExpandedId(isExpanded ? null : ent.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="text-[var(--color-text-500)] hover:text-[var(--color-text-100)] p-0.5"
                          aria-label={isExpanded ? "Collapse block details" : "Expand block details"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="px-2 py-0.5 rounded-md bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.12)] text-[var(--color-text-100)] text-xs font-mono font-medium">
                          {ent.event_type}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-500)] font-mono hidden md:inline">
                          prev: {ent.prev_hash ? ent.prev_hash.slice(0, 8) + "..." : "00000000"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 font-mono text-xs">
                        <div className="flex items-center gap-1 text-[var(--color-teal-400)] text-[11px]">
                          <Hash className="w-3 h-3 text-[var(--color-text-500)]" />
                          <span>{ent.content_hash?.slice(0, 10)}...</span>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-500)] hidden sm:inline">
                          {new Date(ent.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Payload & JSON Viewer */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[rgba(159,176,204,0.12)] font-mono text-xs space-y-2 animate-in fade-in duration-150">
                        <div className="text-[11px] text-[var(--color-text-300)]">
                          <strong className="text-[var(--color-text-500)]">Block ID:</strong> {ent.id}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-300)] break-all">
                          <strong className="text-[var(--color-text-500)]">Previous Hash:</strong>{" "}
                          {ent.prev_hash || "(Genesis Block)"}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-300)] break-all">
                          <strong className="text-[var(--color-text-500)]">Content Hash:</strong>{" "}
                          {ent.content_hash}
                        </div>
                        <div>
                          <strong className="text-[11px] text-[var(--color-text-500)] block mb-1">
                            Block Payload:
                          </strong>
                          <pre className="p-3 rounded-lg bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.1)] text-[var(--color-text-100)] text-[11px] overflow-x-auto leading-relaxed">
                            {JSON.stringify(ent.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
