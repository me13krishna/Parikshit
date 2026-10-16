"use client";

import React, { useState, useEffect } from "react";
import {
  GitFork,
  Play,
  Loader2,
  FileCode,
  Terminal,
} from "lucide-react";
import { TwinNode, TwinEdge, TwinImpact, SandboxResult } from "../lib/types";
import { api, ApiClientError } from "../lib/api";
import { SandboxResults } from "./SandboxResults";

interface TwinGraphProps {
  revisionId: string;
  onError: (err: ApiClientError) => void;
}

export const TwinGraph: React.FC<TwinGraphProps> = ({ revisionId, onError }) => {
  const [nodes, setNodes] = useState<TwinNode[]>([]);
  const [edges, setEdges] = useState<TwinEdge[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [impact, setImpact] = useState<TwinImpact | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Sandbox suite checks
  const [sandboxRunning, setSandboxRunning] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] = useState<SandboxResult | null>(null);

  const onErrorRef = React.useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const fetchGraph = async () => {
      setLoading(true);
      try {
        const res = await api.getTwinGraph(revisionId || "default");
        setNodes(res.nodes || []);
        setEdges(res.edges || []);
        if (res.nodes && res.nodes.length > 0) {
          setSelectedFile(res.nodes[0].path || res.nodes[0].label || res.nodes[0].id);
        }
      } catch (err: unknown) {
        if (err instanceof ApiClientError && onErrorRef.current) onErrorRef.current(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, [revisionId]);

  // Compute visual 2D positions for nodes on SVG canvas
  const nodeLayout = React.useMemo(() => {
    const coords: Record<string, { x: number; y: number }> = {};
    if (!nodes || nodes.length === 0) return coords;

    const sources = nodes.filter((n) => n.kind !== "test" && !n.path?.includes("test"));
    const tests = nodes.filter((n) => n.kind === "test" || n.path?.includes("test"));

    sources.forEach((n, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      coords[n.id] = {
        x: 80 + col * 170,
        y: 45 + row * 65,
      };
    });

    tests.forEach((n, idx) => {
      coords[n.id] = {
        x: 460,
        y: 50 + idx * 60,
      };
    });

    return coords;
  }, [nodes]);

  const handleSimulate = async () => {
    if (!selectedFile) return;
    setSimulating(true);
    try {
      const res = await api.simulateTwinImpact(revisionId, selectedFile);
      setImpact(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleRunVerificationChecks = async () => {
    setSandboxRunning(true);
    try {
      const res = await api.runChecks("default", "pytest");
      setSandboxResult(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setSandboxRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header Context */}
      <div className="flex items-center justify-between pb-3 border-b border-[#29313D]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#191F2B] text-[#6AD7FA] border border-[#29313D]">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#F4F6FA] font-display">
              Software Digital Twin
            </h2>
            <p className="text-[11px] text-[#929BAA]">
              AST entity dependency graphs, blast-radius impact simulation, and affected test suites
            </p>
          </div>
        </div>

        <button
          onClick={handleRunVerificationChecks}
          disabled={sandboxRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191F2B] hover:bg-[#222B3D] text-[#F4F6FA] text-xs font-mono border border-[#29313D] transition-colors"
        >
          {sandboxRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Terminal className="w-3.5 h-3.5 text-[#C6F36B]" />
          )}
          <span>Execute Sandbox Suite</span>
        </button>
      </div>

      {/* Main Grid: AST Entities & Impact Predictor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tracked Entities Rail */}
        <section className="rounded-xl border border-[#29313D] bg-[#121720] p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#29313D]">
            <span className="text-xs font-mono font-semibold text-[#F4F6FA]">
              AST Entities ({nodes.length})
            </span>
            <span className="text-[10px] text-[#5E697A] font-mono">Call Graph</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#5E697A] text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#C6F36B]" />
              <span>Indexing AST graph...</span>
            </div>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {nodes.map((n) => {
                const isSelected = selectedFile === (n.label || n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedFile(n.label || n.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-[#191F2B] text-[#C6F36B] border border-[#29313D]"
                        : "text-[#929BAA] hover:bg-[#191F2B]/60 hover:text-[#F4F6FA] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-[#5E697A]" />
                      <span className="truncate">{n.label || n.id}</span>
                    </div>
                    <span className="text-[10px] text-[#5E697A] shrink-0 ml-1">
                      {n.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Blast-Radius Simulator Cockpit */}
        <section className="md:col-span-2 rounded-xl border border-[#29313D] bg-[#121720] p-5 space-y-4 border-active-top shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#29313D]">
            <div>
              <span className="text-[10px] text-[#5E697A] font-mono uppercase tracking-wider">
                Simulation Target
              </span>
              <div className="text-xs font-mono font-semibold text-[#F4F6FA] mt-0.5">
                {selectedFile || "None selected"}
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={!selectedFile || simulating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#C6F36B] hover:bg-[#b5e655] disabled:opacity-50 text-[#0B0D12] text-xs font-semibold transition-colors shadow-sm"
            >
              {simulating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing Blast Radius...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Simulate Blast Radius</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Digital Twin Dependency Canvas */}
          <div className="rounded-lg bg-[#0B0D12] border border-[#29313D] p-3 overflow-hidden relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#29313D]/50 text-[11px] font-mono">
              <span className="text-[#929BAA] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C6F36B]" />
                Interactive Dependency Graph ({nodes.length} nodes, {edges.length} edges)
              </span>
              <div className="flex items-center gap-3 text-[10px] text-[#5E697A]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#C6F36B]" /> Source
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#6AD7FA]" /> Test
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Impacted
                </span>
              </div>
            </div>

            <svg viewBox="0 0 580 200" className="w-full h-48 select-none">
              <defs>
                <marker
                  id="twin-arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#5E697A" />
                </marker>
              </defs>

              {/* Render Directed Edges */}
              {edges.map((e, idx) => {
                const srcCoord = nodeLayout[e.source];
                const tgtCoord = nodeLayout[e.target];
                if (!srcCoord || !tgtCoord) return null;
                const isEdgeImpacted = impact?.affected_files?.some(
                  (af) => nodes.find((n) => n.id === e.target)?.path === af || nodes.find((n) => n.id === e.source)?.path === af
                );
                return (
                  <line
                    key={idx}
                    x1={srcCoord.x}
                    y1={srcCoord.y}
                    x2={tgtCoord.x}
                    y2={tgtCoord.y}
                    stroke={isEdgeImpacted ? "#F43F5E" : "#29313D"}
                    strokeWidth={isEdgeImpacted ? "2" : "1.2"}
                    strokeDasharray={isEdgeImpacted ? "4 2" : undefined}
                    markerEnd="url(#twin-arrow)"
                  />
                );
              })}

              {/* Render Nodes */}
              {nodes.map((n) => {
                const pos = nodeLayout[n.id] || { x: 50, y: 50 };
                const isSelected = selectedFile === (n.path || n.label || n.id);
                const isImpacted = impact?.affected_files?.includes(n.path || "") || false;
                const isTest = n.kind === "test" || (n.path && n.path.includes("test"));
                const nodeColor = isImpacted ? "#F43F5E" : isTest ? "#6AD7FA" : "#C6F36B";

                return (
                  <g
                    key={n.id}
                    className="cursor-pointer transition-all"
                    onClick={() => setSelectedFile(n.path || n.label || n.id)}
                  >
                    {/* Glowing highlight ring */}
                    {(isSelected || isImpacted) && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isSelected ? 16 : 14}
                        fill="none"
                        stroke={nodeColor}
                        strokeWidth="2"
                        className="animate-pulse opacity-70"
                      />
                    )}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={10}
                      fill="#121720"
                      stroke={nodeColor}
                      strokeWidth="2"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 19}
                      textAnchor="middle"
                      className={`text-[9px] font-mono fill-current ${
                        isSelected ? "text-[#C6F36B] font-bold" : isImpacted ? "text-rose-400 font-semibold" : "text-[#929BAA]"
                      }`}
                    >
                      {n.label.length > 16 ? n.label.slice(0, 14) + "..." : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Blast Radius Visual Metrics */}
          {impact && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-lg bg-[#0B0D12] border border-[#29313D]">
                  <span className="text-[#5E697A] text-[10px] block">
                    Blast Radius Score
                  </span>
                  <span className="text-2xl font-bold text-[#F4F6FA] mt-0.5 block">
                    {impact.blast_radius_score}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0B0D12] border border-[#29313D]">
                  <span className="text-[#5E697A] text-[10px] block">Risk Classification</span>
                  <div className="mt-1">
                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full inline-block border ${
                        impact.risk_level === "high"
                          ? "bg-rose-950 text-rose-300 border-rose-800"
                          : impact.risk_level === "medium"
                          ? "bg-amber-950 text-amber-300 border-amber-800"
                          : "bg-emerald-950 text-[#39D98A] border-emerald-800"
                      }`}
                    >
                      {impact.risk_level} Risk
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-[#F4F6FA] block mb-2 font-medium">
                  Downstream Dependent Files:
                </span>
                <ul className="space-y-1.5 font-mono text-xs">
                  {impact.affected_files && impact.affected_files.length > 0 ? (
                    impact.affected_files.map((af, i) => (
                      <li
                        key={i}
                        className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#29313D] text-[#F4F6FA] flex items-center gap-2"
                      >
                        <GitFork className="w-3.5 h-3.5 text-[#C6F36B]" />
                        <span>{af}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#5E697A] text-xs italic p-2">
                      Zero downstream dependencies affected. Isolated modification.
                    </li>
                  )}
                </ul>
              </div>

              {impact.affected_tests && impact.affected_tests.length > 0 && (
                <div>
                  <span className="text-xs font-mono text-[#F4F6FA] block mb-2 font-medium">
                    Affected Test Suites:
                  </span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {impact.affected_tests.map((tst, ti) => (
                      <span
                        key={ti}
                        className="px-2.5 py-1 rounded bg-[#0B0D12] border border-[#29313D] text-[#39D98A]"
                      >
                        {tst}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!impact && !simulating && (
            <div className="p-8 text-center text-xs text-[#5E697A] rounded-xl bg-[#0B0D12] border border-[#29313D]">
              Click &ldquo;Simulate Blast Radius&rdquo; to predict downstream dependencies and affected test suites before modifying code.
            </div>
          )}
        </section>
      </div>

      {/* Sandbox Test Execution Panel */}
      {sandboxResult && (
        <section className="rounded-xl border border-[#29313D] bg-[#121720] p-5 shadow-xl">
          <div className="text-xs font-semibold text-[#F4F6FA] mb-2 font-display">
            Sandbox Verification Output
          </div>
          <SandboxResults result={sandboxResult} />
        </section>
      )}
    </div>
  );
};
