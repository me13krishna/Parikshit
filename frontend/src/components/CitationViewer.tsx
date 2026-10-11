"use client";

import React, { useState } from "react";
import { X, CheckCircle2, AlertCircle, FileCode, Hash, Copy, Check } from "lucide-react";
import { Citation } from "../lib/types";

interface CitationViewerProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationViewer: React.FC<CitationViewerProps> = ({ citation, onClose }) => {
  const [copied, setCopied] = useState(false);
  if (!citation) return null;

  const handleCopy = () => {
    if (!citation.snippet) return;
    navigator.clipboard.writeText(citation.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-viewer-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.2)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border-active-top">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[rgba(159,176,204,0.12)] flex items-center justify-between bg-[var(--color-ink-950)]/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(106,215,250,0.1)] text-[var(--color-cyan-300)]">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 id="citation-viewer-title" className="text-xs font-semibold text-[var(--color-text-100)] font-mono">
                {citation.path}
              </h3>
              <p className="text-[11px] text-[var(--color-text-500)]">
                Lines {citation.start_line} to {citation.end_line}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close citation viewer"
            className="p-1.5 rounded-lg text-[var(--color-text-500)] hover:text-[var(--color-text-100)] hover:bg-[var(--color-ink-800)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Grounding Verification Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.14)] text-xs font-mono">
            <div className="flex items-center gap-2">
              {citation.verified !== false ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span className={citation.verified !== false ? "text-emerald-300 font-medium" : "text-amber-300 font-medium"}>
                {citation.verified !== false ? "Verified Grounded Citation" : "Unverified Citation"}
              </span>
            </div>

            {citation.snippet_hash && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-500)]">
                <Hash className="w-3.5 h-3.5 text-[var(--color-text-500)]" />
                <span>sha256_{citation.snippet_hash.slice(0, 10)}</span>
              </div>
            )}
          </div>

          {citation.error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono">
              <strong>Error:</strong> {citation.error}
            </div>
          )}

          {/* Snippet Code Container */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-[var(--color-text-500)]">
                Source Snippet
              </span>
              <button
                onClick={handleCopy}
                aria-label="Copy snippet"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-ink-800)] hover:bg-[var(--color-ink-950)] text-[var(--color-text-300)] text-[11px] font-mono transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy Snippet"}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.14)] text-[var(--color-text-100)] font-mono text-xs overflow-x-auto leading-relaxed max-h-80">
              <code>{citation.snippet || "// No snippet content extracted."}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[rgba(159,176,204,0.12)] bg-[var(--color-ink-950)]/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--color-ink-800)] hover:bg-[var(--color-ink-800)]/80 text-[var(--color-text-100)] text-xs font-medium transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
