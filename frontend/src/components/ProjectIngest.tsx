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
  Check,
} from "lucide-react";
import { api, ApiClientError } from "../lib/api";
import { PipelineOrbit, PipelineStage } from "./PipelineOrbit";
import { TwinLedgerSideBySide } from "./TwinLedgerSideBySide";
import { HealthData, LedgerVerifyResult } from "../lib/types";

interface ProjectIngestProps {
  onIngestSuccess: (project: { project_id: string; default_revision_id: string; name: string }) => void;
  onError: (err: ApiClientError) => void;
  onNavigateStage?: (stage: PipelineStage) => void;
  onGlobalAiQuery?: (query: string, targetStage: PipelineStage) => void;
  projectName?: string;
  revisionId?: string;
  projectId?: string;
  health?: HealthData | null;
  ledgerStatus?: LedgerVerifyResult | null;
}

export const ProjectIngest: React.FC<ProjectIngestProps> = ({
  onIngestSuccess,
  onError,
  onNavigateStage,
  onGlobalAiQuery,
  projectName = "No Active Project",
  revisionId,
  projectId,
  health,
  ledgerStatus,
}) => {
  const [globalAiInput, setGlobalAiInput] = useState<string>("");
  const [sourceType, setSourceType] = useState<"git" | "local" | "zip">("git");
  const [sourceUri, setSourceUri] = useState<string>("");
  const [inputProjectName, setInputProjectName] = useState<string>("");
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
        let uri = sourceUri.trim();
        if (sourceType === "git" && !uri.startsWith("http://") && !uri.startsWith("https://")) {
          uri = `https://${uri}`;
        }
        res = await api.ingestProject({
          source_type: sourceType,
          source_uri: uri,
          name: inputProjectName.trim() || uri.split("/").pop()?.replace(".git", "") || "Imported Project",
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
    } else if (
      text.includes("ledger") ||
      text.includes("proof") ||
      text.includes("sha") ||
      text.includes("evidence")
    ) {
      targetStage = "ledger";
    }

    if (onGlobalAiQuery) {
      onGlobalAiQuery(globalAiInput.trim(), targetStage);
    } else if (onNavigateStage) {
      onNavigateStage(targetStage);
    }
  };

  const isChainValid = ledgerStatus ? ledgerStatus.valid : true;
  const isDocker = health?.sandbox_mode === "docker" || health?.sandbox?.includes("docker");

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 pt-2">
      {/* 1. Ultra-Clean Hero & Quick Actions */}
      <section className="space-y-6 text-center max-w-2xl mx-auto pt-4">
        {/* Quiet Kicker */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
          <span>AST Grounded Intelligence</span>
          <span className="text-[var(--text-muted)]">•</span>
          <span>{projectName}</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)] font-sans">
          Engineering Workspace
        </h1>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Explore codebase architecture with verified AST citations, build human-gated patches, and audit changes with cryptographic proof.
        </p>

        {/* Global Action / Search Bar */}
        <form onSubmit={handleGlobalAiSubmit} className="pt-2">
          <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] focus-within:border-[#5E6AD2] px-3.5 py-2.5 shadow-sm transition-all text-left">
            <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              value={globalAiInput}
              onChange={(e) => setGlobalAiInput(e.target.value)}
              placeholder="Ask the Mentor a query or describe a feature to build..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none font-sans"
            />
            <button
              type="submit"
              disabled={!globalAiInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-[var(--text-primary)] hover:opacity-90 disabled:opacity-30 text-[var(--bg-primary)] text-xs font-medium flex items-center gap-1 transition-opacity shrink-0"
            >
              <span>Execute</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Workspace Connection Row */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowIngestModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] transition-colors"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Connect Repository</span>
          </button>

          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] transition-colors"
            title="Load bundled arithmetic calculator repository"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5E6AD2]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#5E6AD2]" />
            )}
            <span>Load Demo Calculator</span>
          </button>
        </div>
      </section>

      {/* 2. Spotlight Workspaces: Mentor & Agent */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spotlight 1: Codebase Mentor */}
        <div
          onClick={() => onNavigateStage && onNavigateStage("mentor")}
          role="button"
          tabIndex={0}
          className="group relative p-5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)]/50 border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] text-[#5E6AD2] flex items-center justify-center border border-[var(--border-subtle)]">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                AST Grounded
              </span>
            </div>

            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] font-sans group-hover:text-[#5E6AD2] transition-colors">
                Codebase Mentor
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Understand architecture, invariants, and call graphs with zero hallucinations and line-range citations.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono text-[var(--text-muted)]">
                AST Syntax Citations
              </span>
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono text-[var(--text-muted)]">
                Architecture Tour
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-primary)] group-hover:text-[#5E6AD2] transition-colors pt-2 border-t border-[var(--border-subtle)]">
            <span>Open Mentor Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Spotlight 2: AI Coding Agent */}
        <div
          onClick={() => onNavigateStage && onNavigateStage("tasks")}
          role="button"
          tabIndex={0}
          className="group relative p-5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)]/50 border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] text-[#2DD4BF] flex items-center justify-center border border-[var(--border-subtle)]">
                <Hammer className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Human-Gated
              </span>
            </div>

            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] font-sans group-hover:text-[#2DD4BF] transition-colors">
                AI Coding Agent
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Generate task plans, preview isolated diffs in the sandbox, and require cryptographic human sign-off before export.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono text-[var(--text-muted)]">
                Task Planner
              </span>
              <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono text-[var(--text-muted)]">
                Unified Diff Preview
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-primary)] group-hover:text-[#2DD4BF] transition-colors pt-2 border-t border-[var(--border-subtle)]">
            <span>Launch Coding Agent</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </section>

      {/* 3. Sleek Secondary Tools Row */}
      <section className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold block px-1">
          Verification & Intelligence Tools
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => onNavigateStage && onNavigateStage("battle")}
            className="p-3 rounded-lg bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] text-left transition-colors group"
          >
            <div className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[#818CF8]">AI Code Battle</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Adversary stress arena</p>
          </button>

          <button
            onClick={() => onNavigateStage && onNavigateStage("twin")}
            className="p-3 rounded-lg bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] text-left transition-colors group"
          >
            <div className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[#2DD4BF]">Autonomous QA</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Test runner & diagnostics</p>
          </button>

          <button
            onClick={() => onNavigateStage && onNavigateStage("twin")}
            className="p-3 rounded-lg bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] text-left transition-colors group"
          >
            <div className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[#5E6AD2]">Digital Twin</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Dependency blast radius</p>
          </button>

          <button
            onClick={() => onNavigateStage && onNavigateStage("ledger")}
            className="p-3 rounded-lg bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] text-left transition-colors group"
          >
            <div className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[#34D399]">Audit Ledger</div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">SHA-256 proof-of-work</p>
          </button>
        </div>
      </section>

      {/* =====================================================================
          5. WORKSPACE INGESTION MODAL
          ===================================================================== */}
      {showIngestModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Connect repository workspace"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIngestModal(false);
          }}
        >
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-sm font-semibold font-sans text-[var(--text-primary)]">
                  Connect Repository Workspace
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Import local directories, clone remote Git repositories, or upload ZIP archives.
                </p>
              </div>
              <button
                onClick={() => setShowIngestModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md"
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
                  setSourceUri("");
                }}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                  sourceType === "local"
                    ? "bg-[var(--surface-2)] border-[#5E6AD2] text-[#5E6AD2]"
                    : "bg-[var(--surface-2)]/40 border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                <FolderCode className="w-4 h-4 mb-1" />
                <div className="font-semibold text-[var(--text-primary)]">Local</div>
                <div className="text-[10px] text-[var(--text-muted)]">Local directory</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceType("git");
                  setSourceUri("");
                }}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                  sourceType === "git"
                    ? "bg-[var(--surface-2)] border-[#5E6AD2] text-[#5E6AD2]"
                    : "bg-[var(--surface-2)]/40 border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                <FolderGit2 className="w-4 h-4 mb-1" />
                <div className="font-semibold text-[var(--text-primary)]">Git</div>
                <div className="text-[10px] text-[var(--text-muted)]">HTTPS clone</div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("zip")}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                  sourceType === "zip"
                    ? "bg-[var(--surface-2)] border-[#5E6AD2] text-[#5E6AD2]"
                    : "bg-[var(--surface-2)]/40 border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                <UploadCloud className="w-4 h-4 mb-1" />
                <div className="font-semibold text-[var(--text-primary)]">ZIP</div>
                <div className="text-[10px] text-[var(--text-muted)]">Archive upload</div>
              </button>
            </div>

            {/* Ingest Form */}
            <form onSubmit={handleIngest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={inputProjectName}
                  onChange={(e) => setInputProjectName(e.target.value)}
                  placeholder="e.g. Authentication Service"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#5E6AD2]"
                  required
                />
              </div>

              {sourceType === "zip" ? (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Select ZIP Archive
                  </label>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[var(--surface-2)] file:text-[var(--text-primary)]"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
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
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-[#5E6AD2]"
                    required
                  />
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-[var(--surface-2)] border border-[#34D399]/40 rounded-lg text-[#34D399] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] text-xs hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-[var(--text-primary)] hover:opacity-90 disabled:opacity-50 text-[var(--bg-primary)] font-semibold text-xs flex items-center gap-2 transition-opacity shadow-sm"
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
