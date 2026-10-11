"use client";

import React from "react";
import { X, CheckCircle2, AlertCircle, FileCode, Hash } from "lucide-react";
import { Citation } from "../lib/types";

interface CitationViewerProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationViewer: React.FC<CitationViewerProps> = ({ citation, onClose }) => {
  if (!citation) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-viewer-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 id="citation-viewer-title" className="text-xs font-semibold text-zinc-100 font-mono">
                {citation.path}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Lines {citation.start_line} – {citation.end_line}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close citation viewer"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verification Status & Metadata */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              {citation.verified ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span className={citation.verified ? "text-emerald-300 font-medium" : "text-amber-300 font-medium"}>
                {citation.verified ? "Verified Grounded Citation" : "Unverified Citation"}
              </span>
            </div>
            {citation.snippet_hash && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                <Hash className="w-3 h-3 text-zinc-600" />
                <span>sha: {citation.snippet_hash.slice(0, 12)}</span>
              </div>
            )}
          </div>

          {citation.error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-mono">
              <strong>Error:</strong> {citation.error}
            </div>
          )}

          {/* Snippet Display */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5 font-semibold">
              Grounding Snippet
            </label>
            <pre className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs overflow-x-auto leading-relaxed">
              <code>{citation.snippet || "// No snippet content extracted."}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
