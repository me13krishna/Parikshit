"use client";

import React, { useState, useEffect } from "react";
import { Network, GitFork, Play, Loader2, FileCode } from "lucide-react";
import { TwinNode, TwinImpact } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

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

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider font-mono">
            Digital Twin & Impact Simulator
          </h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Dependency call graphs and blast-radius prediction before executing file changes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Node Explorer */}
        <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-4 space-y-3">
          <div className="text-xs font-mono font-semibold text-zinc-400 uppercase">Tracked Entities ({nodes.length})</div>
          {loading ? (
            <div className="p-4 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading AST graph...</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {nodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedFile(n.label || n.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-all ${
                    selectedFile === (n.label || n.id)
                      ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                      : "text-zinc-400 hover:bg-zinc-900 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                    <span className="truncate">{n.label || n.id}</span>
                  </div>
                  <span className="text-[10px] text-zinc-600">{n.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Blast-Radius Simulator */}
        <div className="md:col-span-2 border border-zinc-800 bg-zinc-950 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <span className="text-xs text-zinc-400 font-mono">Target Entity for Simulation:</span>
              <div className="text-xs font-mono font-semibold text-zinc-200 mt-0.5">
                {selectedFile || "None selected"}
              </div>
            </div>
            <button
              onClick={handleSimulate}
              disabled={!selectedFile || simulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 text-white text-xs font-semibold transition-colors"
            >
              {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Simulate Blast Radius</span>
            </button>
          </div>

          {impact && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">Blast Radius Score</span>
                  <span className="text-lg font-bold text-zinc-100">{impact.blast_radius_score}</span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">Risk Level</span>
                  <span
                    className={`text-xs font-bold uppercase px-2 py-0.5 rounded inline-block mt-1 ${
                      impact.risk_level === "high"
                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                        : impact.risk_level === "medium"
                        ? "bg-amber-950 text-amber-300 border border-amber-800"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    }`}
                  >
                    {impact.risk_level}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-zinc-400 block mb-2">Affected Downstream Files:</span>
                <ul className="space-y-1 font-mono text-xs">
                  {impact.affected_files && impact.affected_files.length > 0 ? (
                    impact.affected_files.map((af, i) => (
                      <li key={i} className="p-2 rounded bg-zinc-900/60 text-zinc-300 flex items-center gap-2">
                        <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{af}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-zinc-500 text-xs italic">Zero downstream dependencies affected.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
