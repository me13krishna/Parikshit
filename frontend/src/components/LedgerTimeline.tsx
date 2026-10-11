"use client";

import React, { useState, useEffect } from "react";
import { History, ShieldCheck, ShieldAlert, Download, RefreshCw, Hash, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { LedgerEntry, LedgerVerifyResult } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

interface LedgerTimelineProps {
  projectId?: string;
  onError: (err: ApiClientError) => void;
  onVerifyChange?: (res: LedgerVerifyResult) => void;
}

export const LedgerTimeline: React.FC<LedgerTimelineProps> = ({ projectId, onError, onVerifyChange }) => {
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
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header & Verification Bar */}
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-5 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider font-mono">
              Proof-of-Work Hash Ledger
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Tamper-evident, hash-chained ledger storing every ingestion, task, patch, sandbox execution, and battle.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition-colors"
          >
            {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Verify Integrity</span>
          </button>

          <button
            onClick={handleDownloadEvidencePack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm shadow-cyan-950/40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Evidence Pack</span>
          </button>
        </div>
      </div>

      {/* Verification Status Card */}
      <div
        data-testid="ledger-verification-panel"
        className={`p-4 rounded-xl border flex items-center justify-between font-mono text-xs ${
          isValid
            ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
            : "bg-red-950/50 border-red-700/60 text-red-200"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isValid ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
          )}
          <div>
            <span className="font-bold">
              {isValid
                ? "Cryptographic Chain Verified: Intact"
                : `CHAIN BROKEN at Sequence #${verifyStatus?.broken_at_sequence ?? "unknown"}!`}
            </span>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-sans">
              {isValid
                ? `All ${entries.length} local entries match SHA-256 forward and backward links.`
                : `Tampering detected in database rows: ${verifyStatus?.error}`}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 hidden sm:block">
          Checked {entries.length} entries
        </div>
      </div>

      {/* Entries List */}
      <div className="border border-zinc-800 bg-zinc-950 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-3 bg-zinc-900/80 border-b border-zinc-800 text-xs font-mono text-zinc-400 flex items-center justify-between">
          <span>Ledger History ({entries.length} Events)</span>
          <span className="text-[10px] text-zinc-500">SHA-256 Hash Chained</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Loading blockchain entries...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs font-mono">
            No entries recorded yet. Ingest a project to initialize the chain.
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {entries.map((ent) => {
              const isExpanded = expandedId === ent.id;
              return (
                <div key={ent.id} className="p-4 hover:bg-zinc-900/40 transition-colors">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : ent.id)}
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-zinc-500 hover:text-zinc-300">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <span className="font-mono text-xs font-bold text-cyan-400 w-10">
                        #{ent.sequence}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono">
                        {ent.event_type}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono hidden md:inline">
                        prev: {ent.prev_hash?.slice(0, 8)}...
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                        <Hash className="w-3 h-3" />
                        <span>{ent.content_hash?.slice(0, 10)}...</span>
                      </div>
                      <span className="text-[10px] text-zinc-600 hidden sm:inline">
                        {new Date(ent.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 font-mono text-xs space-y-2 animate-in fade-in">
                      <div className="text-[11px] text-zinc-400">
                        <strong>Entry ID:</strong> {ent.id}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        <strong>Previous Hash:</strong> {ent.prev_hash}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        <strong>Content Hash:</strong> {ent.content_hash}
                      </div>
                      <div>
                        <strong className="text-[11px] text-zinc-400 block mb-1">Payload:</strong>
                        <pre className="p-2 rounded bg-zinc-950 text-zinc-300 text-[11px] overflow-x-auto">
                          {JSON.stringify(ent.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
