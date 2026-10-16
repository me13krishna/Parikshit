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
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[var(--surface-2)] text-[#2DD4BF] border border-[var(--border-subtle)]">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-primary)] font-sans">
              Software Digital Twin
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Real-time AST node-link graph with blast-radius ripple prediction
            </p>
          </div>
        </div>

        <button
          onClick={handleRunVerificationChecks}
          disabled={sandboxRunning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-primary)] text-xs font-mono border border-[var(--border-subtle)] transition-colors self-start sm:self-auto"
        >
          {sandboxRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5E6AD2]" />
          ) : (
            <Terminal className="w-3.5 h-3.5 text-[#2DD4BF]" />
          )}
          <span>Run Sandbox Checks</span>
        </button>
      </div>

      {/* Main Grid: File / Entity Index & Blast Radius Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Entity File Tree */}
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-mono uppercase text-[var(--text-muted)] font-semibold">
              AST Indexed Entities
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {nodes.length} nodes
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#5E6AD2]" />
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
                        ? "bg-[var(--surface-2)] text-[#5E6AD2] border border-[var(--border-hover)] font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--text-primary)] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                      <span className="truncate">{n.label || n.id}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-1">
                      {n.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Blast-Radius Simulator Cockpit */}
        <section className="md:col-span-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
                Simulation Target
              </span>
              <div className="text-xs font-mono font-semibold text-[var(--text-primary)] mt-0.5">
                {selectedFile || "None selected"}
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={!selectedFile || simulating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--text-primary)] hover:opacity-90 disabled:opacity-50 text-[var(--bg-primary)] text-xs font-semibold transition-opacity shadow-sm"
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
          <div className="rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] p-3 overflow-hidden relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)] text-[11px] font-mono">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
                Interactive Dependency Graph ({nodes.length} nodes, {edges.length} edges)
              </span>
              <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" /> Source
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#5E6AD2]" /> Test
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
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.2)" />
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
                    stroke={isEdgeImpacted ? "#F43F5E" : "var(--border-subtle)"}
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
                const nodeColor = isImpacted ? "#F43F5E" : isTest ? "#5E6AD2" : "#2DD4BF";

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
                      fill="var(--surface-1)"
                      stroke={nodeColor}
                      strokeWidth="2"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 19}
                      textAnchor="middle"
                      className={`text-[9px] font-mono fill-current ${
                        isSelected ? "text-[#5E6AD2] font-bold" : isImpacted ? "text-rose-400 font-semibold" : "text-[var(--text-muted)]"
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
                <div className="p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)] text-[10px] block">
                    Blast Radius Score
                  </span>
                  <span className="text-2xl font-bold text-[var(--text-primary)] mt-0.5 block">
                    {impact.blast_radius_score}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)] text-[10px] block">Risk Classification</span>
                  <div className="mt-1">
                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full inline-block border ${
                        impact.risk_level === "high"
                          ? "bg-rose-950/40 text-rose-300 border-rose-800/40"
                          : impact.risk_level === "medium"
                          ? "bg-amber-950/40 text-amber-300 border-amber-800/40"
                          : "bg-emerald-950/40 text-[#34D399] border-emerald-800/40"
                      }`}
                    >
                      {impact.risk_level} Risk
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-[var(--text-primary)] block mb-2 font-medium">
                  Downstream Dependent Files:
                </span>
                <ul className="space-y-1.5 font-mono text-xs">
                  {impact.affected_files && impact.affected_files.length > 0 ? (
                    impact.affected_files.map((af, i) => (
                      <li
                        key={i}
                        className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center gap-2"
                      >
                        <GitFork className="w-3.5 h-3.5 text-[#5E6AD2]" />
                        <span>{af}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[var(--text-muted)] text-xs italic p-2">
                      Zero downstream dependencies affected. Isolated modification.
                    </li>
                  )}
                </ul>
              </div>

              {impact.affected_tests && impact.affected_tests.length > 0 && (
                <div>
                  <span className="text-xs font-mono text-[var(--text-primary)] block mb-2 font-medium">
                    Affected Test Suites:
                  </span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {impact.affected_tests.map((tst, ti) => (
                      <span
                        key={ti}
                        className="px-2.5 py-1 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[#34D399]"
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
            <div className="p-8 text-center text-xs text-[var(--text-muted)] rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              Click &ldquo;Simulate Blast Radius&rdquo; to predict downstream dependencies and affected test suites before modifying code.
            </div>
          )}
        </section>
      </div>

      {/* Sandbox Test Execution Panel */}
      {sandboxResult && (
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 shadow-xl">
          <div className="text-xs font-semibold text-[var(--text-primary)] mb-2 font-sans">
            Sandbox Verification Output
          </div>
          <SandboxResults result={sandboxResult} />
        </section>
      )}
    </div>
  );
};
