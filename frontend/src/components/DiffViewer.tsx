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
      <div className="p-8 text-center border border-zinc-800 bg-zinc-900/30 rounded-xl text-zinc-500 text-xs font-mono">
        No code changes generated yet. Create a task and execute the builder.
      </div>
    );
  }

  const lines = diff.split("\n");

  return (
    <div className="border border-zinc-800 bg-zinc-950 rounded-xl overflow-hidden shadow-lg">
      <div className="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
          <FileDiff className="w-4 h-4 text-cyan-400" />
          <span>Unified Patch Diff</span>
          {filesChanged.length > 0 && (
            <span className="text-[11px] text-zinc-500">
              ({filesChanged.length} file{filesChanged.length > 1 ? "s" : ""} modified)
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          aria-label="Copy diff"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
          <span>{copied ? "Copied" : "Copy Diff"}</span>
        </button>
      </div>

      <div className="p-4 overflow-x-auto max-h-[500px] text-xs font-mono leading-relaxed">
        {lines.map((line, idx) => {
          let lineClass = "text-zinc-400";
          let bgClass = "";

          if (line.startsWith("+") && !line.startsWith("+++")) {
            lineClass = "text-emerald-400 font-medium";
            bgClass = "bg-emerald-950/20";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            lineClass = "text-rose-400 font-medium";
            bgClass = "bg-rose-950/20";
          } else if (line.startsWith("@@")) {
            lineClass = "text-cyan-400 font-semibold";
            bgClass = "bg-cyan-950/10";
          } else if (line.startsWith("diff ") || line.startsWith("index ")) {
            lineClass = "text-zinc-500 font-bold";
          }

          return (
            <div key={idx} className={`flex px-2 py-0.5 rounded ${bgClass}`}>
              <span className="w-8 select-none text-zinc-600 text-[10px] text-right pr-3 shrink-0">{idx + 1}</span>
              <span className={`whitespace-pre ${lineClass}`}>{line || " "}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
