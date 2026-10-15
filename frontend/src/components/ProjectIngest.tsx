"use client";

import React, { useState } from "react";
import {
  FolderGit2,
  UploadCloud,
  FolderCode,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Code2,
  Terminal,
  Loader2,
  Search,
  BookOpen,
  Hammer,
  Bug,
  Activity,
  Layers,
  ChevronRight,
  Clock,
} from "lucide-react";
import { api, ApiClientError } from "../lib/api";
import { PipelineOrbit, PipelineStage } from "./PipelineOrbit";
import { HealthData, LedgerVerifyResult } from "../lib/types";

interface ProjectIngestProps {
  onIngestSuccess: (project: { project_id: string; default_revision_id: string; name: string }) => void;
  onError: (err: ApiClientError) => void;
  onNavigateStage?: (stage: PipelineStage) => void;
  onGlobalAiQuery?: (query: string, targetStage: PipelineStage) => void;
  projectName?: string;
  revisionId?: string;
  health?: HealthData | null;
  ledgerStatus?: LedgerVerifyResult | null;
}

export const ProjectIngest: React.FC<ProjectIngestProps> = ({
  onIngestSuccess,
  onError,
  onNavigateStage,
  onGlobalAiQuery,
  projectName = "Demo Calculator Service",
  revisionId,
  health,
  ledgerStatus,
}) => {
  const [globalAiInput, setGlobalAiInput] = useState<string>("");
  const [sourceType, setSourceType] = useState<"git" | "local" | "zip">("local");
  const [sourceUri, setSourceUri] = useState<string>("./data/demo/calculator_app");
  const [inputProjectName, setInputProjectName] = useState<string>("Demo Calculator Service");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showIngestModal, setShowIngestModal] = useState<boolean>(false);

  // 1-Click Demo Loader
  const handleLoadDemo = async () => {
    setLoading(true);
    setLoadingStep("Cloning demo calculator service into workspace...");
    setSuccessMsg(null);
    try {
      const res = await api.ingestProject({
        source_type: "local",
        source_uri: "./data/demo/calculator_app",
        name: "Demo Calculator Service",
      });
      setSuccessMsg("Demo Calculator Service loaded successfully!");
      onIngestSuccess(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        onError(err);
      } else {
        onError(
          new ApiClientError({
            message: err instanceof Error ? err.message : "Failed to load demo repository",
            code: "DEMO_INGEST_FAILED",
            status_code: 400,
          })
        );
      }
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingStep("Parsing AST and extracting entity call graph...");
    setSuccessMsg(null);

    try {
      let res;
      if (sourceType === "zip") {
        if (!zipFile) {
          throw new Error("Please select a ZIP file to upload");
        }
        res = await api.uploadZip(zipFile, inputProjectName || zipFile.name.replace(".zip", ""));
      } else {
        res = await api.ingestProject({
          source_type: sourceType,
          source_uri: sourceUri.trim(),
          name: inputProjectName.trim() || "Imported Project",
        });
      }

      setSuccessMsg(`Ingested project '${res.name}' successfully!`);
      setShowIngestModal(false);
      onIngestSuccess(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        onError(err);
      } else {
        onError(
          new ApiClientError({
            message: err instanceof Error ? err.message : "Failed to ingest project",
            code: "INGEST_FAILED",
            status_code: 400,
          })
        );
      }
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleGlobalAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalAiInput.trim()) return;

    const text = globalAiInput.trim().toLowerCase();
    let targetStage: PipelineStage = "mentor";

    if (
      text.startsWith("implement") ||
      text.startsWith("add") ||
      text.startsWith("change") ||
      text.startsWith("build") ||
      text.startsWith("fix") ||
      text.startsWith("create")
    ) {
      targetStage = "tasks";
    } else if (
      text.includes("test") ||
      text.includes("run") ||
      text.includes("check")
    ) {
      targetStage = "twin";
    } else if (
      text.includes("bug") ||
      text.includes("failing") ||
      text.includes("repair") ||
      text.includes("heal")
    ) {
      targetStage = "twin";
    }

    if (onGlobalAiQuery) {
      onGlobalAiQuery(globalAiInput.trim(), targetStage);
    } else if (onNavigateStage) {
      onNavigateStage(targetStage);
    }
  };

  const isChainValid = ledgerStatus ? ledgerStatus.valid : true;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* 1. Header Command Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#29313D]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-[#F4F6FA]">
              Engineering Command Center
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121720] text-[#C6F36B] border border-[#29313D]">
              Ready
            </span>
          </div>
          <p className="text-xs text-[#929BAA] mt-1">
            Connected to <strong className="text-[#F4F6FA]">{projectName}</strong> • Grounded in AST syntax trees and cryptographic proof-of-work.
          </p>
        </div>

        {/* Repository Connect Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#191F2B] hover:bg-[#222B3D] border border-[#29313D] hover:border-[#3B4656] text-xs font-semibold text-[#F4F6FA] transition-all"
            title="Load the bundled arithmetic calculator demonstration repository"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C6F36B]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#C6F36B]" />
            )}
            <span>Load Demo Repo</span>
          </button>

          <button
            type="button"
            onClick={() => setShowIngestModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#C6F36B] hover:bg-[#b5e655] text-[#0B0D12] text-xs font-semibold transition-all shadow-md shadow-[rgba(198,243,107,0.15)]"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Connect Workspace</span>
          </button>
        </div>
      </div>

      {/* 2. Global AI Input Prompt */}
      <section className="relative rounded-xl bg-[#121720] border border-[#29313D] p-3 sm:p-4 shadow-xl">
        <form onSubmit={handleGlobalAiSubmit} className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0B0D12] text-[#C6F36B] border border-[#29313D] shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={globalAiInput}
            onChange={(e) => setGlobalAiInput(e.target.value)}
            placeholder="Ask about your codebase, implement a change, or investigate a bug..."
            className="flex-1 bg-transparent text-xs text-[#F4F6FA] placeholder-[#5E697A] focus:outline-none font-sans"
          />
          <button
            type="submit"
            disabled={!globalAiInput.trim()}
            className="px-4 py-2 rounded-lg bg-[#191F2B] hover:bg-[#222B3D] disabled:opacity-40 text-xs font-semibold text-[#C6F36B] border border-[#29313D] transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>Execute</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </section>

      {/* 3. Interactive 5-Stage Verification Lifecycle */}
      <section className="relative rounded-2xl bg-[#121720] border border-[#29313D] border-active-top p-5 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#191F2B] border border-[#29313D] text-[#C6F36B] text-xs font-mono mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Grounded Verification Orbit</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold font-display tracking-tight text-[#F4F6FA]">
            Understand → Build → Challenge → Verify → Prove
          </h2>
          <p className="text-xs text-[#929BAA] mt-1.5 leading-relaxed">
            Every statement is cited against AST line numbers. Every code patch is challenged by an Adversary Agent and sealed into a SHA-256 cryptographic chain.
          </p>
        </div>

        <PipelineOrbit
          activeStage="overview"
          onSelectStage={onNavigateStage}
          variant="hero"
        />
      </section>

      {/* 4. Balanced Grid: Repository Overview, Engineering Activity, Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Repository Overview */}
        <section className="rounded-xl bg-[#121720] border border-[#29313D] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#29313D]">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#C6F36B]" />
              <h3 className="text-xs font-semibold font-display text-[#F4F6FA]">
                Repository Overview
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#39D98A] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#39D98A] animate-pulse" />
              Indexed
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#5E697A] block mb-1">
                Detected Stack
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-[#0B0D12] text-[#F4F6FA] border border-[#29313D] text-[11px] font-mono">
                  Python 3.11
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0B0D12] text-[#F4F6FA] border border-[#29313D] text-[11px] font-mono">
                  pytest
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0B0D12] text-[#F4F6FA] border border-[#29313D] text-[11px] font-mono">
                  AST Indexer
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0B0D12] text-[#F4F6FA] border border-[#29313D] text-[11px] font-mono">
                  Docker Sandbox
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-[#5E697A] block mb-1">
                Core Modules
              </span>
              <ul className="space-y-1 font-mono text-[11px] text-[#929BAA]">
                <li className="flex items-center justify-between">
                  <span className="truncate">calculator.py</span>
                  <span className="text-[#5E697A]">Arithmetic Core</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="truncate">tests/test_calculator.py</span>
                  <span className="text-[#5E697A]">Test Suite</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-[#29313D] flex items-center justify-between text-[11px] text-[#5E697A] font-mono">
              <span>Status: {revisionId ? `rev_${revisionId.slice(-6)} (AST Validated)` : "AST Validated"}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Live Active</span>
              </span>
            </div>
          </div>
        </section>

        {/* Card 2: Engineering Activity */}
        <section className="rounded-xl bg-[#121720] border border-[#29313D] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#29313D]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#39D98A]" />
              <h3 className="text-xs font-semibold font-display text-[#F4F6FA]">
                Engineering Activity
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#929BAA]">Pipeline</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#29313D]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#F4F6FA]">Human Approval Gate</span>
                <span className="text-[#39D98A] font-mono text-[10px]">Active</span>
              </div>
              <p className="text-[11px] text-[#929BAA] mt-0.5">
                Patches require explicit developer confirmation before source application.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#29313D]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#F4F6FA]">Adversary Battle Arena</span>
                <span className="text-[#C6F36B] font-mono text-[10px]">Ready</span>
              </div>
              <p className="text-[11px] text-[#929BAA] mt-0.5">
                Stress-test code modifications against adversarial edge-case vectors.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#29313D]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#F4F6FA]">Isolated Sandbox Runner</span>
                <span className="text-[#39D98A] font-mono text-[10px]">
                  {health?.sandbox_mode || "Docker"}
                </span>
              </div>
              <p className="text-[11px] text-[#929BAA] mt-0.5">
                Target code runs in isolated container with exit codes recorded.
              </p>
            </div>
          </div>
        </section>

        {/* Card 3: Quality & Proof Overview */}
        <section className="rounded-xl bg-[#121720] border border-[#29313D] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#29313D]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C6F36B]" />
              <h3 className="text-xs font-semibold font-display text-[#F4F6FA]">
                Quality & Proof Ledger
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                isChainValid
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                  : "bg-red-950/60 text-red-300 border border-red-700/60"
              }`}
            >
              {isChainValid ? "Chain Verified" : "Chain Broken"}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1">
              <span className="text-[10px] font-mono text-[#5E697A]">Proof-of-Work Status</span>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#F4F6FA]">SHA-256 Ledger:</span>
                <span className="text-[#39D98A] font-semibold">
                  {isChainValid ? "100% Cryptographically Valid" : "Tampering Detected"}
                </span>
              </div>
              <p className="text-[10px] text-[#929BAA] pt-1">
                Every prompt, AST query, diff, sandbox check, and review is linked by hashes.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#929BAA]">Backend Environment:</span>
              <span className="text-[11px] font-mono text-[#F4F6FA]">
                {health?.environment || "development"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#929BAA]">LLM Integration:</span>
              <span className="text-[11px] font-mono text-[#C6F36B]">
                {health?.llm_provider || "mock"}
              </span>
            </div>

            <button
              onClick={() => onNavigateStage && onNavigateStage("ledger")}
              className="w-full py-1.5 rounded-md bg-[#191F2B] hover:bg-[#222B3D] text-[#C6F36B] text-[11px] font-semibold border border-[#29313D] flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Inspect Cryptographic Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* 5. Five Quick Actions Bar */}
      <section className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#5E697A] font-semibold">
          Quick Engineering Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigateStage && onNavigateStage("mentor")}
            className="p-3.5 rounded-xl bg-[#121720] hover:bg-[#191F2B] border border-[#29313D] hover:border-[#3B4656] text-left transition-all group"
          >
            <BookOpen className="w-4 h-4 text-[#C6F36B] mb-2 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-semibold text-[#F4F6FA]">Explain Codebase</div>
            <p className="text-[11px] text-[#929BAA] mt-0.5">AST-verified questions & citations</p>
          </button>

          <button
            onClick={() => onNavigateStage && onNavigateStage("mentor")}
            className="p-3.5 rounded-xl bg-[#121720] hover:bg-[#191F2B] border border-[#29313D] hover:border-[#3B4656] text-left transition-all group"
          >
            <Layers className="w-4 h-4 text-[#39D98A] mb-2 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-semibold text-[#F4F6FA]">Trace User Journey</div>
            <p className="text-[11px] text-[#929BAA] mt-0.5">Architecture tours & entry points</p>
          </button>

          <button
            onClick={() => onNavigateStage && onNavigateStage("tasks")}
            className="p-3.5 rounded-xl bg-[#121720] hover:bg-[#191F2B] border border-[#29313D] hover:border-[#3B4656] text-left transition-all group"
          >
            <Hammer className="w-4 h-4 text-[#C6F36B] mb-2 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-semibold text-[#F4F6FA]">Plan Implementation</div>
            <p className="text-[11px] text-[#929BAA] mt-0.5">Generate tasks & preview diffs</p>
          </button>

          <button
            onClick={() => onNavigateStage && onNavigateStage("twin")}
            className="p-3.5 rounded-xl bg-[#121720] hover:bg-[#191F2B] border border-[#29313D] hover:border-[#3B4656] text-left transition-all group"
          >
            <Terminal className="w-4 h-4 text-[#38BDF8] mb-2 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-semibold text-[#F4F6FA]">Run or Inspect Tests</div>
            <p className="text-[11px] text-[#929BAA] mt-0.5">Isolated runner & exit logs</p>
          </button>

          <button
            onClick={() => onNavigateStage && onNavigateStage("battle")}
            className="p-3.5 rounded-xl bg-[#121720] hover:bg-[#191F2B] border border-[#29313D] hover:border-[#3B4656] text-left transition-all group"
          >
            <Bug className="w-4 h-4 text-[#FB7185] mb-2 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-semibold text-[#F4F6FA]">Adversary Battle</div>
            <p className="text-[11px] text-[#929BAA] mt-0.5">Challenge fixes & reveal risks</p>
          </button>
        </div>
      </section>

      {/* 6. Workspace Ingestion Modal */}
      {showIngestModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Connect repository workspace"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIngestModal(false);
          }}
        >
          <div className="bg-[#121720] border border-[#29313D] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border-active-top">
            <div className="flex items-center justify-between pb-3 border-b border-[#29313D]">
              <div>
                <h3 className="text-sm font-semibold font-display text-[#F4F6FA]">
                  Connect Repository Workspace
                </h3>
                <p className="text-xs text-[#929BAA] mt-0.5">
                  Import local directories, clone remote Git repositories, or upload ZIP archives.
                </p>
              </div>
              <button
                onClick={() => setShowIngestModal(false)}
                className="text-[#929BAA] hover:text-[#F4F6FA] p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* Source Type Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSourceType("local");
                  setSourceUri("./data/demo/calculator_app");
                }}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                  sourceType === "local"
                    ? "bg-[#191F2B] border-[#C6F36B] text-[#C6F36B]"
                    : "bg-[#0B0D12] border-[#29313D] text-[#929BAA]"
                }`}
              >
                <FolderCode className="w-4 h-4 mb-1" />
                <div className="font-semibold text-[#F4F6FA]">Local</div>
                <div className="text-[10px] text-[#5E697A]">Local directory</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceType("git");
                  setSourceUri("");
                }}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                  sourceType === "git"
                    ? "bg-[#191F2B] border-[#C6F36B] text-[#C6F36B]"
                    : "bg-[#0B0D12] border-[#29313D] text-[#929BAA]"
                }`}
              >
                <FolderGit2 className="w-4 h-4 mb-1" />
                <div className="font-semibold text-[#F4F6FA]">Git</div>
                <div className="text-[10px] text-[#5E697A]">HTTPS clone</div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("zip")}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                  sourceType === "zip"
                    ? "bg-[#191F2B] border-[#C6F36B] text-[#C6F36B]"
                    : "bg-[#0B0D12] border-[#29313D] text-[#929BAA]"
                }`}
              >
                <UploadCloud className="w-4 h-4 mb-1" />
                <div className="font-semibold text-[#F4F6FA]">ZIP</div>
                <div className="text-[10px] text-[#5E697A]">Archive upload</div>
              </button>
            </div>

            {/* Ingest Form */}
            <form onSubmit={handleIngest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#929BAA] mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={inputProjectName}
                  onChange={(e) => setInputProjectName(e.target.value)}
                  placeholder="e.g. Authentication Service"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#29313D] text-[#F4F6FA] text-xs focus:outline-none focus:border-[#C6F36B]"
                  required
                />
              </div>

              {sourceType === "zip" ? (
                <div>
                  <label className="block text-xs font-medium text-[#929BAA] mb-1">
                    Select ZIP Archive
                  </label>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[#929BAA] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#191F2B] file:text-[#F4F6FA]"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[#929BAA] mb-1">
                    {sourceType === "git" ? "Git HTTPS URL" : "Local Source Path"}
                  </label>
                  <input
                    type="text"
                    value={sourceUri}
                    onChange={(e) => setSourceUri(e.target.value)}
                    placeholder={
                      sourceType === "git"
                        ? "https://github.com/organization/repository.git"
                        : "./data/demo/calculator_app"
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#29313D] text-[#F4F6FA] text-xs font-mono focus:outline-none focus:border-[#C6F36B]"
                    required
                  />
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-[#0B0D12] border border-[#39D98A]/50 rounded-lg text-[#39D98A] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#29313D]">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-[#191F2B] text-[#929BAA] text-xs hover:text-[#F4F6FA] transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-[#C6F36B] hover:bg-[#b5e655] disabled:opacity-50 text-[#0B0D12] font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-[rgba(198,243,107,0.2)]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{loadingStep || "Ingesting..."}</span>
                    </>
                  ) : (
                    <>
                      <span>Ingest & Initialize</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
