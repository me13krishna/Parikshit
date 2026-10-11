"use client";

import React, { useState } from "react";
import { FileDiff, Copy, Check } from "lucide-react";

interface DiffViewerProps {
  diff: string;
  filesChanged?: string[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, filesChanged = [] }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    if (!diff) return;
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!diff) {
    return (
      <div className="p-8 text-center border border-[rgba(159,176,204,0.12)] bg-[var(--color-ink-950)]/40 rounded-xl text-[var(--color-text-500)] text-xs font-mono">
        No code changes generated yet. Specify a task and build in sandbox.
      </div>
    );
  }

  const lines = diff.split("\n");

  return (
    <div className="border border-[rgba(159,176,204,0.16)] bg-[var(--color-ink-950)] rounded-xl overflow-hidden shadow-xl">
      {/* Diff Toolbar */}
      <div className="px-4 py-2.5 bg-[var(--color-ink-900)] border-b border-[rgba(159,176,204,0.12)] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-100)]">
          <FileDiff className="w-4 h-4 text-[var(--color-cyan-300)]" />
          <span className="font-semibold">Unified Patch Diff</span>
          {filesChanged.length > 0 && (
            <span className="text-[11px] text-[var(--color-text-500)] font-sans">
              ({filesChanged.length} file{filesChanged.length > 1 ? "s" : ""} modified)
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          aria-label="Copy diff"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-ink-800)] hover:bg-[var(--color-ink-800)]/80 text-[var(--color-text-300)] hover:text-[var(--color-text-100)] text-[11px] font-mono transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[var(--color-text-500)]" />
          )}
          <span>{copied ? "Copied" : "Copy Diff"}</span>
        </button>
      </div>

      {/* Code Lines with Dual-Encoded +/- and subtle backgrounds */}
      <div className="p-3 overflow-x-auto max-h-[480px] text-xs font-mono leading-relaxed select-text">
        {lines.map((line, idx) => {
          let lineTextClass = "text-[var(--color-text-300)]";
          let bgClass = "";
          let markerSymbol = " ";

          if (line.startsWith("+") && !line.startsWith("+++")) {
            lineTextClass = "text-emerald-300 font-medium";
            bgClass = "bg-emerald-950/25";
            markerSymbol = "+";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            lineTextClass = "text-rose-300 font-medium";
            bgClass = "bg-rose-950/25";
            markerSymbol = "-";
          } else if (line.startsWith("@@")) {
            lineTextClass = "text-[var(--color-cyan-300)] font-semibold";
            bgClass = "bg-[rgba(106,215,250,0.08)]";
            markerSymbol = "@";
          } else if (line.startsWith("diff ") || line.startsWith("index ")) {
            lineTextClass = "text-[var(--color-text-500)] font-bold";
            markerSymbol = "•";
          }

          return (
            <div
              key={idx}
              className={`flex items-start px-2 py-0.5 rounded ${bgClass} hover:bg-[var(--color-ink-800)]/40 transition-colors`}
            >
              {/* Line Gutter */}
              <span className="w-8 select-none text-[var(--color-text-500)] text-[10px] text-right pr-2 shrink-0">
                {idx + 1}
              </span>
              {/* Diff Marker Indicator */}
              <span className="w-4 select-none font-bold text-center shrink-0 opacity-80" aria-hidden="true">
                {markerSymbol}
              </span>
              {/* Diff Line Content */}
              <span className={`whitespace-pre flex-1 ${lineTextClass}`}>
                {line || " "}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
