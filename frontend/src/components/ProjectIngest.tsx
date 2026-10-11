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
  FileText,
  Loader2,
} from "lucide-react";
import { api, ApiClientError } from "../lib/api";
import { PipelineOrbit, PipelineStage } from "./PipelineOrbit";

interface ProjectIngestProps {
  onIngestSuccess: (project: { project_id: string; default_revision_id: string; name: string }) => void;
  onError: (err: ApiClientError) => void;
  onNavigateStage?: (stage: PipelineStage) => void;
}

export const ProjectIngest: React.FC<ProjectIngestProps> = ({
  onIngestSuccess,
  onError,
  onNavigateStage,
}) => {
  const [sourceType, setSourceType] = useState<"git" | "local" | "zip">("local");
  const [sourceUri, setSourceUri] = useState<string>("./data/demo/calculator_app");
  const [projectName, setProjectName] = useState<string>("Demo Calculator Service");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        res = await api.uploadZip(zipFile, projectName || zipFile.name.replace(".zip", ""));
      } else {
        res = await api.ingestProject({
          source_type: sourceType,
          source_uri: sourceUri.trim(),
          name: projectName.trim() || "Imported Project",
        });
      }

      setSuccessMsg(`Ingested project '${res.name}' successfully!`);
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Overview Hero with Brand Pipeline Orbit */}
      <section className="relative overflow-hidden rounded-2xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.18)] border-active-top p-4 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(106,215,250,0.1)] border border-[rgba(106,215,250,0.25)] text-[var(--color-cyan-300)] text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Grounded AI Engineering Teammate</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-bold font-display tracking-tight text-[var(--color-text-100)]">
            Move from Unfamiliar Code to Verified Changes
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-300)] mt-2 leading-relaxed">
            Every statement is cited against AST line numbers. Every code patch is challenged in a multi-round AI battle arena and anchored into an immutable cryptographic ledger.
          </p>
        </div>

        {/* Interactive 5-Stage Pipeline Orbit */}
        <PipelineOrbit
          activeStage="overview"
          onSelectStage={onNavigateStage}
          variant="hero"
        />

        {/* 1-Click Quick Demo CTA Banner */}
        <div className="mt-6 pt-6 border-t border-[rgba(159,176,204,0.12)] flex flex-wrap items-center justify-between gap-4 bg-[var(--color-ink-950)]/50 -mx-4 sm:-mx-8 -mb-4 sm:-mb-8 p-4 sm:p-6 rounded-b-2xl">
          <div>
            <div className="text-xs font-semibold text-[var(--color-text-100)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-cyan-300)]" />
              <span>Explore in 30 seconds with Demo Repository</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-500)] mt-0.5">
              Includes arithmetic calculator service, unit tests, mock LLM responses, and verifiable hash ledger.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-blue-500)] hover:bg-[var(--color-sky-400)] disabled:bg-[var(--color-ink-800)] text-white text-xs font-semibold transition-all shadow-md shadow-[rgba(7,108,211,0.3)] shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingStep || "Loading demo project..."}</span>
              </>
            ) : (
              <>
                <span>Load Demo Project</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </section>

      {/* Custom Repository Ingest Panel */}
      <section className="rounded-2xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.16)] p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold font-display text-[var(--color-text-100)]">
            Ingest Repository for Analysis
          </h2>
          <p className="text-xs text-[var(--color-text-300)] mt-0.5">
            Import local directories, clone remote Git repositories over HTTPS, or upload safe ZIP archives.
          </p>
        </div>

        {/* Source Type Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setSourceType("local");
              setSourceUri("./data/demo/calculator_app");
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              sourceType === "local"
                ? "bg-[rgba(106,215,250,0.1)] border-[rgba(106,215,250,0.4)] text-[var(--color-cyan-300)] shadow-sm"
                : "bg-[var(--color-ink-950)] border-[rgba(159,176,204,0.12)] text-[var(--color-text-300)] hover:border-[rgba(159,176,204,0.25)]"
            }`}
          >
            <FolderCode className="w-4 h-4 mb-2 text-[var(--color-cyan-300)]" />
            <div className="text-xs font-semibold text-[var(--color-text-100)]">Local Workspace</div>
            <div className="text-[11px] text-[var(--color-text-500)] mt-0.5">Instant local file indexing</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSourceType("git");
              setSourceUri("");
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              sourceType === "git"
                ? "bg-[rgba(106,215,250,0.1)] border-[rgba(106,215,250,0.4)] text-[var(--color-cyan-300)] shadow-sm"
                : "bg-[var(--color-ink-950)] border-[rgba(159,176,204,0.12)] text-[var(--color-text-300)] hover:border-[rgba(159,176,204,0.25)]"
            }`}
          >
            <FolderGit2 className="w-4 h-4 mb-2 text-[var(--color-violet-400)]" />
            <div className="text-xs font-semibold text-[var(--color-text-100)]">Git Repository</div>
            <div className="text-[11px] text-[var(--color-text-500)] mt-0.5">Clone via HTTPS clone URL</div>
          </button>

          <button
            type="button"
            onClick={() => setSourceType("zip")}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              sourceType === "zip"
                ? "bg-[rgba(106,215,250,0.1)] border-[rgba(106,215,250,0.4)] text-[var(--color-cyan-300)] shadow-sm"
                : "bg-[var(--color-ink-950)] border-[rgba(159,176,204,0.12)] text-[var(--color-text-300)] hover:border-[rgba(159,176,204,0.25)]"
            }`}
          >
            <UploadCloud className="w-4 h-4 mb-2 text-[var(--color-teal-400)]" />
            <div className="text-xs font-semibold text-[var(--color-text-100)]">ZIP Archive</div>
            <div className="text-[11px] text-[var(--color-text-500)] mt-0.5">Isolated extraction & audit</div>
          </button>
        </div>

        {/* Ingest Form */}
        <form onSubmit={handleIngest} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-300)] mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Authentication Service"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.18)] text-[var(--color-text-100)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-300)]"
              required
            />
          </div>

          {sourceType === "zip" ? (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-300)] mb-1.5">
                Select ZIP Archive
              </label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-[var(--color-text-300)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-ink-800)] file:text-[var(--color-text-100)] hover:file:bg-[var(--color-ink-800)]/80"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-300)] mb-1.5">
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
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.18)] text-[var(--color-text-100)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-300)]"
                required
              />
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-[var(--color-ink-950)] border border-[var(--color-teal-400)]/40 rounded-xl text-[var(--color-teal-400)] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[var(--color-blue-500)] hover:bg-[var(--color-sky-400)] disabled:bg-[var(--color-ink-800)] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[rgba(7,108,211,0.25)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingStep || "Ingesting repository..."}</span>
              </>
            ) : (
              <>
                <span>Ingest & Initialize Revision</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </section>

      {/* Four Guarantees Footer Pillars */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.12)]">
          <Code2 className="w-4 h-4 text-[var(--color-teal-400)] mb-2" />
          <div className="text-xs font-semibold text-[var(--color-text-100)]">Grounded Citations</div>
          <p className="text-[11px] text-[var(--color-text-500)] mt-1">
            Every statement links to exact AST syntax trees and line ranges.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.12)]">
          <FileText className="w-4 h-4 text-[var(--color-blue-500)] mb-2" />
          <div className="text-xs font-semibold text-[var(--color-text-100)]">Human Approval Gate</div>
          <p className="text-[11px] text-[var(--color-text-500)] mt-1">
            Explicit gatekeeper confirms patches before any code is applied.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.12)]">
          <Sparkles className="w-4 h-4 text-[var(--color-violet-400)] mb-2" />
          <div className="text-xs font-semibold text-[var(--color-text-100)]">Adversarial Battles</div>
          <p className="text-[11px] text-[var(--color-text-500)] mt-1">
            Adversary agent attacks new code with relentless edge-case stress tests.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.12)]">
          <ShieldCheck className="w-4 h-4 text-[var(--color-lavender-300)] mb-2" />
          <div className="text-xs font-semibold text-[var(--color-text-100)]">Immutable Ledger</div>
          <p className="text-[11px] text-[var(--color-text-500)] mt-1">
            Tamper-evident SHA-256 chain anchors all events into proof evidence.
          </p>
        </div>
      </section>
    </div>
  );
};
