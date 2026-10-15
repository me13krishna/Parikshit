"use client";

import React, { useState } from "react";
import { FileDiff, Copy, Check, Columns, AlignLeft } from "lucide-react";

interface DiffViewerProps {
  diff: string;
  filesChanged?: string[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, filesChanged = [] }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  const handleCopy = () => {
    if (!diff) return;
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!diff) {
    return (
      <div className="p-8 text-center border border-[#29313D] bg-[#0B0D12] rounded-xl text-[#5E697A] text-xs font-mono">
        No code changes generated yet. Specify a task and build in sandbox.
      </div>
    );
  }

  const lines = diff.split("\n");

  return (
    <div className="border border-[#29313D] bg-[#0B0D12] rounded-xl overflow-hidden shadow-xl">
      {/* Diff Toolbar */}
      <div className="px-4 py-2.5 bg-[#121720] border-b border-[#29313D] flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs font-mono text-[#F4F6FA]">
          <FileDiff className="w-4 h-4 text-[#C6F36B]" />
          <span className="font-semibold">Unified Patch Diff</span>
          {filesChanged.length > 0 && (
            <span className="text-[11px] text-[#929BAA] font-sans">
              ({filesChanged.length} file{filesChanged.length > 1 ? "s" : ""} modified)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-[#0B0D12] rounded-md p-0.5 border border-[#29313D]">
            <button
              onClick={() => setViewMode("unified")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                viewMode === "unified"
                  ? "bg-[#191F2B] text-[#C6F36B] font-semibold"
                  : "text-[#929BAA] hover:text-[#F4F6FA]"
              }`}
            >
              <AlignLeft className="w-3 h-3" />
              <span>Unified</span>
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                viewMode === "split"
                  ? "bg-[#191F2B] text-[#C6F36B] font-semibold"
                  : "text-[#929BAA] hover:text-[#F4F6FA]"
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            aria-label="Copy diff"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#191F2B] hover:bg-[#222B3D] text-[#929BAA] hover:text-[#F4F6FA] text-[11px] font-mono border border-[#29313D] transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#39D98A]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#5E697A]" />
            )}
            <span>{copied ? "Copied" : "Copy Diff"}</span>
          </button>
        </div>
      </div>

      {/* Code Lines Container */}
      <div className="p-3 overflow-x-auto max-h-[480px] text-xs font-mono leading-relaxed select-text">
        {lines.map((line, idx) => {
          let lineTextClass = "text-[#929BAA]";
          let bgClass = "";
          let markerSymbol = " ";

          if (line.startsWith("+") && !line.startsWith("+++")) {
            lineTextClass = "text-[#39D98A] font-medium";
            bgClass = "bg-emerald-950/20";
            markerSymbol = "+";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            lineTextClass = "text-[#FB7185] font-medium";
            bgClass = "bg-rose-950/20";
            markerSymbol = "-";
          } else if (line.startsWith("@@")) {
            lineTextClass = "text-[#C6F36B] font-semibold";
            bgClass = "bg-[#C6F36B]/5";
            markerSymbol = "@";
          } else if (line.startsWith("diff ") || line.startsWith("index ")) {
            lineTextClass = "text-[#5E697A] font-bold";
            markerSymbol = "•";
          }

          return (
            <div
              key={idx}
              className={`flex items-start px-2 py-0.5 rounded ${bgClass} hover:bg-[#121720] transition-colors`}
            >
              {/* Line Gutter */}
              <span className="w-8 select-none text-[#5E697A] text-[10px] text-right pr-2 shrink-0">
                {idx + 1}
              </span>
              {/* Marker Indicator */}
              <span className="w-4 select-none font-bold text-center shrink-0 opacity-80" aria-hidden="true">
                {markerSymbol}
              </span>
              {/* Line Content */}
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
