"use client";

import React, { useState, useEffect } from "react";
import {
  GitFork,
  Play,
  Loader2,
  FileCode,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { TwinNode, TwinImpact, SandboxResult } from "../lib/types";
import { api, ApiClientError } from "../lib/api";
import { SandboxResults } from "./SandboxResults";

interface TwinGraphProps {
  revisionId: string;
  onError: (err: ApiClientError) => void;
}

export const TwinGraph: React.FC<TwinGraphProps> = ({ revisionId, onError }) => {
  const [nodes, setNodes] = useState<TwinNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [impact, setImpact] = useState<TwinImpact | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Sandbox suite checks
  const [sandboxRunning, setSandboxRunning] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] = useState<SandboxResult | null>(null);

  useEffect(() => {
    if (!revisionId) return;
    const fetchGraph = async () => {
      setLoading(true);
      try {
        const res = await api.getTwinGraph(revisionId);
        setNodes(res.nodes || []);
        if (res.nodes && res.nodes.length > 0) {
          setSelectedFile(res.nodes[0].label || res.nodes[0].id);
        }
      } catch (err: unknown) {
        if (err instanceof ApiClientError) onError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, [revisionId, onError]);

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
      // Run Pytest suite
      const res = await api.runChecks("default", "pytest");
      setSandboxResult(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) onError(err);
    } finally {
      setSandboxRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Context */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(159,176,204,0.12)]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[rgba(106,215,250,0.12)] text-[var(--color-cyan-300)]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-text-100)] font-display">
              Stage 4: Verify
            </h2>
            <p className="text-[11px] text-[var(--color-text-500)]">
              Digital twin dependency graphs, blast-radius simulation, and sandbox self-healing
            </p>
          </div>
        </div>

        <button
          onClick={handleRunVerificationChecks}
          disabled={sandboxRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-ink-800)] hover:bg-[var(--color-ink-800)]/80 text-[var(--color-text-100)] text-xs font-mono border border-[rgba(159,176,204,0.16)] transition-colors"
        >
          {sandboxRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Terminal className="w-3.5 h-3.5 text-[var(--color-cyan-300)]" />
          )}
          <span>Execute Sandbox Suite</span>
        </button>
      </div>

      {/* Main Grid: AST Entities & Impact Predictor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tracked Entities Rail */}
        <section className="rounded-2xl border border-[rgba(159,176,204,0.16)] bg-[var(--color-ink-900)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-[var(--color-text-300)]">
              AST Entities ({nodes.length})
            </span>
            <span className="text-[10px] text-[var(--color-text-500)] font-mono">Call Graph</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-[var(--color-text-500)] text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--color-cyan-300)]" />
              <span>Indexing AST graph...</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {nodes.map((n) => {
                const isSelected = selectedFile === (n.label || n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedFile(n.label || n.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-[rgba(106,215,250,0.12)] text-[var(--color-cyan-300)] border border-[rgba(106,215,250,0.3)]"
                        : "text-[var(--color-text-300)] hover:bg-[var(--color-ink-800)]/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-500)]" />
                      <span className="truncate">{n.label || n.id}</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-500)] shrink-0 ml-1">
                      {n.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Blast-Radius Simulator Cockpit */}
        <section className="md:col-span-2 rounded-2xl border border-[rgba(159,176,204,0.16)] bg-[var(--color-ink-900)] p-5 space-y-4 border-active-top">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(159,176,204,0.12)]">
            <div>
              <span className="text-[11px] text-[var(--color-text-500)] font-mono">
                Simulation Target:
              </span>
              <div className="text-xs font-mono font-semibold text-[var(--color-text-100)] mt-0.5">
                {selectedFile || "None selected"}
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={!selectedFile || simulating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--color-blue-500)] hover:bg-[var(--color-sky-400)] disabled:bg-[var(--color-ink-800)] text-white text-xs font-semibold transition-colors shadow-sm"
            >
              {simulating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing AST Blast Radius...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Simulate Blast Radius</span>
                </>
              )}
            </button>
          </div>

          {/* Blast Radius Visual Metrics */}
          {impact && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.14)]">
                  <span className="text-[var(--color-text-500)] text-[10px] block">
                    Blast Radius Score
                  </span>
                  <span className="text-xl font-bold text-[var(--color-text-100)] mt-0.5 block">
                    {impact.blast_radius_score}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.14)]">
                  <span className="text-[var(--color-text-500)] text-[10px] block">Risk Level</span>
                  <div className="mt-1">
                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full inline-block border ${
                        impact.risk_level === "high"
                          ? "bg-rose-950 text-rose-300 border-rose-800"
                          : impact.risk_level === "medium"
                          ? "bg-amber-950 text-amber-300 border-amber-800"
                          : "bg-emerald-950 text-emerald-300 border-emerald-800"
                      }`}
                    >
                      {impact.risk_level} Risk
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-[var(--color-text-300)] block mb-2">
                  Downstream Dependent Files:
                </span>
                <ul className="space-y-1.5 font-mono text-xs">
                  {impact.affected_files && impact.affected_files.length > 0 ? (
                    impact.affected_files.map((af, i) => (
                      <li
                        key={i}
                        className="p-2.5 rounded-lg bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.1)] text-[var(--color-text-100)] flex items-center gap-2"
                      >
                        <GitFork className="w-3.5 h-3.5 text-[var(--color-cyan-300)]" />
                        <span>{af}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[var(--color-text-500)] text-xs italic p-2">
                      Zero downstream dependencies affected. Isolated modification.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {!impact && !simulating && (
            <div className="p-6 text-center text-xs text-[var(--color-text-500)] rounded-xl bg-[var(--color-ink-950)]/50 border border-[rgba(159,176,204,0.1)]">
              Click &ldquo;Simulate Blast Radius&rdquo; to predict downstream dependencies before modifying code.
            </div>
          )}
        </section>
      </div>

      {/* Sandbox Test Execution Panel */}
      {sandboxResult && (
        <section className="rounded-2xl border border-[rgba(159,176,204,0.16)] bg-[var(--color-ink-900)] p-5">
          <div className="text-xs font-semibold text-[var(--color-text-100)] mb-2 font-display">
            Sandbox Verification Output
          </div>
          <SandboxResults result={sandboxResult} />
        </section>
      )}
    </div>
  );
};
