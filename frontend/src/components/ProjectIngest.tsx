"use client";

import React, { useState } from "react";
import { FolderGit2, UploadCloud, FolderCode, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { api, ApiClientError } from "../lib/api";

interface ProjectIngestProps {
  onIngestSuccess: (project: { project_id: string; default_revision_id: string; name: string }) => void;
  onError: (err: ApiClientError) => void;
}

export const ProjectIngest: React.FC<ProjectIngestProps> = ({ onIngestSuccess, onError }) => {
  const [sourceType, setSourceType] = useState<"git" | "local" | "zip">("local");
  const [sourceUri, setSourceUri] = useState<string>("./data/demo/calculator_app");
  const [projectName, setProjectName] = useState<string>("Demo Calculator Service");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLoadDemo = () => {
    setSourceType("local");
    setSourceUri("./data/demo/calculator_app");
    setProjectName("Demo Calculator Service");
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
          name: projectName.trim() || "Imported Project"
        });
      }

      setSuccessMsg(`Ingested project '${res.name}' successfully!`);
      onIngestSuccess(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        onError(err);
      } else {
        onError(new ApiClientError({
          message: err instanceof Error ? err.message : "Failed to ingest project",
          code: "INGEST_FAILED",
          status_code: 400
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Ingest Repository</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Clone a Git repo, import a local path, or upload a safe ZIP archive to start analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-700/40 hover:bg-cyan-900/60 text-xs font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Load Demo Project
          </button>
        </div>

        {/* Source Type Selector */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              setSourceType("local");
              setSourceUri("./data/demo/calculator_app");
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              sourceType === "local"
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-950/20"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <FolderCode className="w-4 h-4 mb-1.5" />
            <div className="text-xs font-semibold">Local Directory</div>
            <div className="text-[10px] text-zinc-500">Fast local workspace</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSourceType("git");
              setSourceUri("");
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              sourceType === "git"
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-950/20"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <FolderGit2 className="w-4 h-4 mb-1.5" />
            <div className="text-xs font-semibold">Git Repository</div>
            <div className="text-[10px] text-zinc-500">Clone via HTTPS</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSourceType("zip");
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              sourceType === "zip"
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-950/20"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <UploadCloud className="w-4 h-4 mb-1.5" />
            <div className="text-xs font-semibold">ZIP Archive</div>
            <div className="text-[10px] text-zinc-500">Safely extracted upload</div>
          </button>
        </div>

        {/* Ingest Form */}
        <form onSubmit={handleIngest} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. My Service"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              required
            />
          </div>

          {sourceType === "zip" ? (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Select ZIP Archive</label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
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
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                required
              />
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-950/40"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ingesting & Generating AST...</span>
              </>
            ) : (
              <>
                <span>Ingest & Initialize Revision</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
