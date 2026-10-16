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
  Copy,
  Check,
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
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const onErrorRef = React.useRef(onError);
  const onVerifyChangeRef = React.useRef(onVerifyChange);

  useEffect(() => {
    onErrorRef.current = onError;
    onVerifyChangeRef.current = onVerifyChange;
  });

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
          if (onVerifyChangeRef.current) onVerifyChangeRef.current(v);
        }
      } catch (err: unknown) {
        if (!ignore && err instanceof ApiClientError && onErrorRef.current) {
          onErrorRef.current(err);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    loadData();
    return () => {
      ignore = true;
    };
  }, [projectId]);

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

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const isValid = verifyStatus?.valid ?? true;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[var(--surface-2)] text-[#34D399] border border-[var(--border-subtle)]">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-primary)] font-sans">
              Proof-of-Work Ledger
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Cryptographic SHA-256 hash ledger, block chain verification, and downloadable evidence pack
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-primary)] text-xs font-mono border border-[var(--border-subtle)] transition-colors"
          >
            {verifying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5E6AD2]" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-[#5E6AD2]" />
            )}
            <span>Verify Integrity</span>
          </button>

          <button
            onClick={handleDownloadEvidencePack}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--text-primary)] hover:opacity-90 text-[var(--bg-primary)] text-xs font-semibold shadow-sm transition-opacity"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Evidence Pack</span>
          </button>
        </div>
      </div>

      {/* Verification Status Card (Required testid="ledger-verification-panel" for EmptyStates.test.tsx) */}
      <section
        data-testid="ledger-verification-panel"
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-xl ${
          isValid
            ? "bg-[#34D399]/10 border-[#34D399]/25 text-[#34D399]"
            : "bg-[#F87171]/15 border-[#F87171]/30 text-[#F87171]"
        }`}
      >
        <div className="flex items-center gap-3">
          {isValid ? (
            <ShieldCheck className="w-5 h-5 text-[#34D399] shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-[#F87171] animate-pulse shrink-0" />
          )}
          <div>
            <span className="font-bold">
              {isValid
                ? "Cryptographic Chain Verified: Intact"
                : `CHAIN BROKEN at Sequence #${verifyStatus?.broken_at_sequence ?? "unknown"}!`}
            </span>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-sans">
              {isValid
                ? `All ${entries.length} local entries match SHA-256 forward and backward links.`
                : `Tampering detected in database rows: ${verifyStatus?.error}`}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[var(--text-muted)] font-sans hidden sm:block">
          Audit of {entries.length} chained entries
        </div>
      </section>

      {/* Block Chain Timeline */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] overflow-hidden shadow-2xl">
        <div className="px-5 py-3 bg-[var(--surface-2)] border-b border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] flex items-center justify-between">
          <span>Ledger History ({entries.length} Cryptographic Events)</span>
          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
            <Lock className="w-3 h-3 text-[#5E6AD2]" />
            <span>SHA-256 Linked</span>
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[var(--text-muted)] text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#5E6AD2]" />
            <span>Auditing cryptographic blockchain entries...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)] text-xs font-sans space-y-2">
            <p className="font-semibold text-[var(--text-primary)]">No entries recorded yet.</p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Ingest a project or execute a task to initialize the proof chain.
            </p>
          </div>
        ) : (
          <div className="relative p-4 sm:p-6 space-y-4">
            {/* Visual connecting chain line */}
            <div className="absolute left-[29px] sm:left-[37px] top-8 bottom-8 w-[1px] bg-[var(--border-subtle)] select-none pointer-events-none" />

            {entries.map((ent) => {
              const isExpanded = expandedId === ent.id;
              return (
                <div
                  key={ent.id}
                  className="relative flex items-start gap-3 sm:gap-4 group"
                >
                  {/* Sequence Node Circle */}
                  <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center font-mono text-[11px] font-bold text-[var(--text-primary)] group-hover:border-[#5E6AD2] transition-colors shadow-md shrink-0">
                    #{ent.sequence}
                  </div>

                  {/* Block Card */}
                  <div className="flex-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] p-3.5 transition-all hover:border-[var(--border-hover)] shadow-sm">
                    <div
                      className="flex items-center justify-between cursor-pointer select-none"
                      onClick={() => setExpandedId(isExpanded ? null : ent.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
                          aria-label={isExpanded ? "Collapse block details" : "Expand block details"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="px-2 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-mono font-medium">
                          {ent.event_type}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono hidden md:inline">
                          prev: {ent.prev_hash ? ent.prev_hash.slice(0, 8) + "..." : "00000000"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 font-mono text-xs">
                        <div className="flex items-center gap-1 text-[#34D399] text-[11px]">
                          <Hash className="w-3 h-3 text-[var(--text-muted)]" />
                          <span>{ent.content_hash?.slice(0, 10)}...</span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
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
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] font-mono text-xs space-y-2 animate-in fade-in duration-150">
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          <strong className="text-[var(--text-muted)]">Block ID:</strong> {ent.id}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] break-all flex items-center justify-between">
                          <div>
                            <strong className="text-[var(--text-muted)]">Content Hash:</strong>{" "}
                            {ent.content_hash}
                          </div>
                          <button
                            onClick={() => handleCopyHash(ent.content_hash)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === ent.content_hash ? (
                              <Check className="w-3 h-3 text-[#34D399]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] break-all">
                          <strong className="text-[var(--text-muted)]">Previous Hash:</strong>{" "}
                          {ent.prev_hash || "(Genesis Block)"}
                        </div>
                        <div>
                          <strong className="text-[11px] text-[var(--text-muted)] block mb-1">
                            Block Payload:
                          </strong>
                          <pre className="p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-[11px] overflow-x-auto leading-relaxed">
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
