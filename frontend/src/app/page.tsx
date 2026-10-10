"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Terminal,
  Swords,
  GitBranch,
  FileCheck2,
  Cpu,
  Layers,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Download,
  BookOpen,
  ArrowRight,
  Database,
  Lock,
  Sparkles,
  ChevronRight,
  Send,
  Code2,
  FolderTree,
  FileText,
  Hammer,
  TestTube2,
  Check,
  X,
  FileDiff
} from "lucide-react";

interface HealthData {
  status: string;
  database: string;
  sandbox: string;
  llm_provider: string;
  llm_ready: boolean;
  environment: string;
  version: string;
}

interface LedgerEntry {
  id: string;
  sequence: number;
  event_type: string;
  prev_hash: string;
  content_hash: string;
  created_at: string;
  payload: Record<string, unknown>;
}

interface Citation {
  path: string;
  start_line: number;
  end_line: number;
  snippet?: string;
  snippet_hash?: string;
  verified?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  status?: string;
  citations?: Citation[];
  uncertainty_notes?: string;
}

interface ComponentItem {
  name: string;
  responsibility: string;
  files: string[];
  citations?: Citation[];
}

export default function ParikshitApp() {
  const [activeTab, setActiveTab] = useState<"overview" | "mentor" | "vibe" | "battle" | "ledger">("overview");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [gitUrl, setGitUrl] = useState<string>("https://github.com/me13krishna/Parikshit");
  const [currentProject, setCurrentProject] = useState<{ id: string; name: string } | null>(null);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  // Mentor state
  const [overview, setOverview] = useState<{ components: ComponentItem[] } | null>(null);
  const [tours, setTours] = useState<any[]>([]);
  const [currentTourStep, setCurrentTourStep] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userQuestion, setUserQuestion] = useState<string>("");
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  // Vibe Coding & QA state
  const [taskPrompt, setTaskPrompt] = useState<string>("Add multiply function to Calculator with unit tests");
  const [currentTask, setCurrentTask] = useState<any | null>(null);
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [isRunningChecks, setIsRunningChecks] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<string | null>(null);

  // Ledger verification state
  const [isVerifyingLedger, setIsVerifyingLedger] = useState<boolean>(false);
  const [ledgerVerification, setLedgerVerification] = useState<{ valid: boolean; message: string } | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    fetchInitialData();
  }, [API_BASE]);

  const fetchInitialData = async () => {
    try {
      const resHealth = await fetch(`${API_BASE}/health`);
      if (resHealth.ok) {
        const data = await resHealth.json();
        setHealth(data.data);
      }

      const resLedger = await fetch(`${API_BASE}/ledger?limit=15`);
      if (resLedger.ok) {
        const data = await resLedger.json();
        setLedgerEntries(data.data?.entries || []);
      }

      const resProjects = await fetch(`${API_BASE}/projects`);
      if (resProjects.ok) {
        const data = await resProjects.json();
        if (data.data?.projects?.length > 0) {
          const latest = data.data.projects[0];
          setCurrentProject(latest);
          loadProjectDetails(latest.id);
        }
      }
    } catch (err) {
      console.warn("Backend connection pending:", err);
    }
  };

  const loadProjectDetails = async (projectId: string) => {
    try {
      const resOv = await fetch(`${API_BASE}/projects/${projectId}/overview`);
      if (resOv.ok) {
        const data = await resOv.json();
        setOverview(data.data);
      }

      const resTour = await fetch(`${API_BASE}/projects/${projectId}/tours`);
      if (resTour.ok) {
        const data = await resTour.json();
        setTours(data.data?.tours || []);
      }
    } catch (err) {
      console.error("Error loading project details:", err);
    }
  };

  const handleIngest = async () => {
    setIsIngesting(true);
    setIngestSuccess(null);
    try {
      const sourceType = gitUrl.startsWith("http") ? "git_url" : "local";
      const res = await fetch(`${API_BASE}/projects/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: sourceType,
          source_uri: gitUrl,
          name: "Active Workspace"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentProject({ id: data.data.project_id, name: data.data.name });
        setIngestSuccess(`Successfully ingested & indexed ${data.data.file_count} files (${data.data.commit_sha})`);
        loadProjectDetails(data.data.project_id);
        refreshLedger();
      } else {
        const err = await res.json();
        alert(`Ingestion failed: ${err.error?.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Ingest error:", err);
      alert("Could not reach backend API.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleAskMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim() || !currentProject) return;

    const q = userQuestion.trim();
    setUserQuestion("");
    setChatMessages((prev) => [...prev, { role: "user", content: q }]);
    setIsAsking(true);

    try {
      const res = await fetch(`${API_BASE}/projects/${currentProject.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.data.answer_markdown,
            status: data.data.status,
            citations: data.data.citations,
            uncertainty_notes: data.data.uncertainty_notes
          }
        ]);
        refreshLedger();
      }
    } catch (err) {
      console.error("Mentor chat error:", err);
    } finally {
      setIsAsking(false);
    }
  };

  // Vibe Coding Actions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPrompt.trim() || !currentProject) return;

    setIsPlanning(true);
    setSandboxResult(null);
    setApprovalDecision(null);

    try {
      const res = await fetch(`${API_BASE}/projects/${currentProject.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_text: taskPrompt })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentTask(data.data);
        refreshLedger();
      }
    } catch (err) {
      console.error("Task planning error:", err);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleApproveAndBuild = async () => {
    if (!currentTask) return;
    setIsBuilding(true);

    try {
      const res = await fetch(`${API_BASE}/tasks/${currentTask.task_id}/build`, {
        method: "POST"
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentTask((prev: any) => ({
          ...prev,
          status: "review",
          workspace_id: data.data.workspace_id,
          patch: {
            unified_diff: data.data.unified_diff,
            files_changed: data.data.files_changed
          }
        }));
        refreshLedger();
      }
    } catch (err) {
      console.error("Build error:", err);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleRunChecks = async () => {
    if (!currentTask) return;
    setIsRunningChecks(true);

    try {
      const res = await fetch(`${API_BASE}/tasks/${currentTask.task_id}/run-checks`, {
        method: "POST"
      });

      if (res.ok) {
        const data = await res.json();
        setSandboxResult(data.data);
        refreshLedger();
      }
    } catch (err) {
      console.error("Sandbox run error:", err);
    } finally {
      setIsRunningChecks(false);
    }
  };

  const handleHumanApproval = async (decision: "approved" | "rejected") => {
    if (!currentTask) return;

    try {
      const res = await fetch(`${API_BASE}/tasks/${currentTask.task_id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });

      if (res.ok) {
        setApprovalDecision(decision);
        setCurrentTask((prev: any) => ({ ...prev, status: decision }));
        refreshLedger();
      }
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  const refreshLedger = async () => {
    const resLedger = await fetch(`${API_BASE}/ledger?limit=15`);
    if (resLedger.ok) {
      const ldata = await resLedger.json();
      setLedgerEntries(ldata.data?.entries || []);
    }
  };

  const verifyLedgerChain = async () => {
    setIsVerifyingLedger(true);
    try {
      const res = await fetch(`${API_BASE}/ledger/verify`);
      if (res.ok) {
        const data = await res.json();
        setLedgerVerification(data.data);
      }
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setIsVerifyingLedger(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800/80 bg-[#0c1222]/90 flex flex-col justify-between p-4 z-20">
        <div>
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Parikshit
              </h1>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400">Team Vishwam</span>
            </div>
          </div>

          {/* Active Project Pill */}
          {currentProject && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-medium">Active Project</span>
              <span className="font-semibold text-slate-200 truncate block">{currentProject.name}</span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "overview"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Layers className="h-4 w-4" />
              Overview & Control
            </button>

            <button
              onClick={() => setActiveTab("mentor")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "mentor"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Codebase Mentor
            </button>

            <button
              onClick={() => setActiveTab("vibe")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "vibe"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Hammer className="h-4 w-4" />
              Vibe Coding & QA
            </button>

            <button
              onClick={() => setActiveTab("battle")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "battle"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Swords className="h-4 w-4" />
              AI vs AI Battle
            </button>

            <button
              onClick={() => setActiveTab("ledger")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "ledger"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              Proof Ledger
            </button>
          </nav>
        </div>

        {/* System Status in Sidebar Footer */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${health?.status === "ok" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
              Backend API
            </span>
            <span className="font-mono text-[11px] text-slate-300">
              {health ? health.status.toUpperCase() : "CONNECTED"}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span>Database:</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {health?.database === "ok" ? "SQLite WAL" : "Unconnected"}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span>Isolation:</span>
            <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
              <Lock className="h-3 w-3" /> Workspace Sandboxed
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#090d16] to-[#0d1424]">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 px-8 flex items-center justify-between bg-[#090d16]/70 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              Sprint 2 • Vibe Coding & QA Active
            </span>
            <span className="text-slate-500 text-sm">/</span>
            <span className="text-sm text-slate-300 font-medium">Understand → Change → Challenge → Verify → Prove</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/me13krishna/Parikshit"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <GitBranch className="h-3.5 w-3.5 text-cyan-400" />
              me13krishna/Parikshit
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>
          </div>
        </header>

        {/* Tab Views */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Hero Banner */}
              <div className="relative rounded-2xl p-8 border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-cyan-950/30 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 max-w-3xl space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sprints 0 & 1 & 2 Operational
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-white">
                    Move from unfamiliar code to verified, proven changes.
                  </h2>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Parikshit pairs developers with adversarial agents: grounded retrieval with server-verified citations,
                    isolated sandboxes, AI vs AI battle challenges, self-healing diagnostics, and cryptographic proof-of-work.
                  </p>
                </div>
              </div>

              {/* Ingestion & Target Repository */}
              <div className="glass-panel rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-base flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-cyan-400" />
                      Target Repository Ingestion & AST Indexing
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Ingest public Git repository or local codebase for symbol mapping, FTS5 indexing, and architecture synthesis.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    P0 Core Pipeline
                  </span>
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={gitUrl}
                      onChange={(e) => setGitUrl(e.target.value)}
                      placeholder="https://github.com/org/repo.git or local path"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-4 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    disabled={isIngesting}
                    onClick={handleIngest}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    {isIngesting ? "Indexing Codebase..." : "Ingest & Index"}
                  </button>
                </div>

                {ingestSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{ingestSuccess}</span>
                  </div>
                )}
              </div>

              {/* The 5 Pillars Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                  onClick={() => setActiveTab("mentor")}
                  className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition"
                >
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">1. Grounded Codebase Mentor</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Interactive guided tours, architecture overview, and cited Q&A validated server-side against physical line ranges.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab("vibe")}
                  className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition"
                >
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                    <Hammer className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">2. Vibe Coding & QA</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Plan generation, isolated workspace checkouts, unified diffs, sandbox test runs, and human approval gates.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab("ledger")}
                  className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition"
                >
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">3. Proof-of-Work Ledger</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    SHA-256 hash-chained immutable audit trail recording every ingest, diff, sandbox run, and human approval with full evidence export.
                  </p>
                </div>
              </div>

              {/* Recent Ledger Activity */}
              <div className="glass-panel rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-emerald-400" />
                    <h3 className="font-semibold text-white text-base">Live Proof-of-Work Ledger</h3>
                  </div>
                  <button
                    onClick={verifyLedgerChain}
                    disabled={isVerifyingLedger}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    {isVerifyingLedger ? "Verifying..." : "Verify Hash Chain"}
                  </button>
                </div>

                {ledgerVerification && (
                  <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                    ledgerVerification.valid
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-red-500/10 border-red-500/20 text-red-300"
                  }`}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{ledgerVerification.message}</span>
                  </div>
                )}

                <div className="space-y-2">
                  {ledgerEntries.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">No ledger entries recorded yet.</div>
                  ) : (
                    ledgerEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">
                            #{entry.sequence}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-200">{entry.event_type}</span>
                            <span className="text-slate-500 text-[11px] block font-mono">
                              Hash: {entry.content_hash.substring(0, 16)}...
                            </span>
                          </div>
                        </div>
                        <span className="text-slate-500 text-[11px] font-mono">
                          {new Date(entry.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "mentor" && (
            <div className="space-y-8">
              {/* Architecture Overview Cards */}
              <div className="glass-panel rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-semibold text-white text-base flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-indigo-400" />
                      Architecture Overview
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Structured component hierarchy and responsibility mapping.
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                    Verified Schema
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {overview?.components?.map((comp, idx) => (
                    <div key={idx} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-cyan-400" />
                        {comp.name}
                      </h4>
                      <p className="text-xs text-slate-300">{comp.responsibility}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {comp.files?.map((f, i) => (
                          <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )) || (
                    <div className="text-slate-500 text-xs py-4">Ingest a repository above to generate overview.</div>
                  )}
                </div>
              </div>

              {/* Guided Tour Section */}
              {tours.length > 0 && tours[0].steps?.length > 0 && (
                <div className="glass-panel rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-semibold text-white text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        Guided Tour: {tours[0].title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{tours[0].description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        Step {currentTourStep + 1} of {tours[0].steps.length}
                      </span>
                    </div>
                  </div>

                  {tours[0].steps[currentTourStep] && (
                    <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">
                          {tours[0].steps[currentTourStep].title}
                        </h4>
                        <span className="text-xs font-mono text-indigo-400">
                          {tours[0].steps[currentTourStep].path}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {tours[0].steps[currentTourStep].description}
                      </p>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          disabled={currentTourStep === 0}
                          onClick={() => setCurrentTourStep((p) => Math.max(0, p - 1))}
                          className="px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                        >
                          Previous
                        </button>
                        <button
                          disabled={currentTourStep >= tours[0].steps.length - 1}
                          onClick={() => setCurrentTourStep((p) => Math.min(tours[0].steps.length - 1, p + 1))}
                          className="px-3 py-1.5 rounded text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 flex items-center gap-1"
                        >
                          Next Step <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cited Q&A Interactive Mentor Chat */}
              <div className="glass-panel rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-semibold text-white text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-400" />
                      Grounded Codebase Mentor Chat
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      All responses are verified server-side against actual repository source files.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Server Citation Verification Active
                  </span>
                </div>

                <div className="space-y-4 min-h-[200px] max-h-[450px] overflow-y-auto p-2">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      Ask any question about the architecture, functions, tests, or flows.
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl text-xs space-y-2 ${
                          msg.role === "user"
                            ? "bg-indigo-950/40 border border-indigo-500/20 ml-12 text-slate-200"
                            : "bg-slate-950/80 border border-slate-800 mr-12 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className={msg.role === "user" ? "text-indigo-400" : "text-cyan-400"}>
                            {msg.role === "user" ? "You" : "Parikshit Mentor"}
                          </span>
                          {msg.status && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">
                              Status: {msg.status}
                            </span>
                          )}
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                        {/* Citations badges */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              Verified Evidence Citations:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((cit, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedCitation(cit)}
                                  className={`text-[11px] font-mono px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition ${
                                    cit.verified
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                                      : "bg-red-500/10 border-red-500/30 text-red-300"
                                  }`}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  {cit.path} (L{cit.start_line}-{cit.end_line})
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {isAsking && (
                    <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs text-slate-400 animate-pulse">
                      Analyzing indexed chunks and verifying citations...
                    </div>
                  )}
                </div>

                {/* Selected Citation Inspector Modal / Block */}
                {selectedCitation && (
                  <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Grounded Source: {selectedCitation.path} (Lines {selectedCitation.start_line}-{selectedCitation.end_line})
                      </span>
                      <button
                        onClick={() => setSelectedCitation(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕ Close
                      </button>
                    </div>
                    {selectedCitation.snippet && (
                      <pre className="p-3 bg-black/60 rounded text-slate-200 font-mono text-[11px] overflow-x-auto">
                        {selectedCitation.snippet}
                      </pre>
                    )}
                  </div>
                )}

                {/* Chat Input */}
                <form onSubmit={handleAskMentor} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    placeholder="Ask a question about the code (e.g. 'How does division work?')..."
                    className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-lg px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isAsking || !userQuestion.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Ask Mentor
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "vibe" && (
            <div className="space-y-8">
              {/* Task Creation Header */}
              <div className="glass-panel rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-semibold text-white text-base flex items-center gap-2">
                      <Hammer className="h-4 w-4 text-cyan-400" />
                      Vibe Coding & Isolated Workspace
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Describe a feature or fix. The Builder plans, forks an isolated checkout, applies changes, and runs sandbox checks.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                    Module 2 & 3 • Sprint 2
                  </span>
                </div>

                <form onSubmit={handleCreateTask} className="flex gap-3">
                  <input
                    type="text"
                    value={taskPrompt}
                    onChange={(e) => setTaskPrompt(e.target.value)}
                    placeholder="e.g. Add multiply function to Calculator with unit tests"
                    className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-lg px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isPlanning || !taskPrompt.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isPlanning ? "Generating Plan..." : "Generate Plan"}
                  </button>
                </form>
              </div>

              {/* Implementation Plan View */}
              {currentTask?.plan && (
                <div className="glass-panel rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="font-semibold text-white text-sm">Implementation Plan (Review Before Code Generation)</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{currentTask.plan.summary}</p>
                    </div>
                    {currentTask.status === "planning" && (
                      <button
                        onClick={handleApproveAndBuild}
                        disabled={isBuilding}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isBuilding ? "Building in Workspace..." : "Approve Plan & Build"}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Proposed Plan Steps:</span>
                      <div className="space-y-1.5 text-xs">
                        {currentTask.plan.steps?.map((step: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-slate-300">
                            <span className="h-4 w-4 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center text-[10px] font-mono mt-0.5">
                              {step.step}
                            </span>
                            <div>
                              <span className="font-semibold text-slate-200">{step.path}: </span>
                              {step.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Files & Testing:</span>
                      <div className="space-y-2 text-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {currentTask.plan.files_affected?.map((f: string, i: number) => (
                            <span key={i} className="font-mono text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-300">
                              {f}
                            </span>
                          ))}
                        </div>
                        <p className="text-slate-400 text-[11px] pt-1">
                          Strategy: {currentTask.plan.testing_strategy}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Workspace Diff & Sandbox Run Section */}
              {currentTask?.patch && (
                <div className="glass-panel rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <FileDiff className="h-4 w-4 text-cyan-400" />
                      <h4 className="font-semibold text-white text-sm">Isolated Workspace Unified Diff</h4>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRunChecks}
                        disabled={isRunningChecks}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <TestTube2 className="h-3.5 w-3.5" />
                        {isRunningChecks ? "Running Pytest..." : "Run Sandbox Tests"}
                      </button>
                    </div>
                  </div>

                  {/* Unified Diff Display */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-[11px] overflow-x-auto max-h-80">
                    <pre className="text-slate-300">
                      {currentTask.patch.unified_diff.split("\n").map((line: string, idx: number) => (
                        <div
                          key={idx}
                          className={
                            line.startsWith("+")
                              ? "bg-emerald-500/10 text-emerald-300 px-1"
                              : line.startsWith("-")
                              ? "bg-red-500/10 text-red-300 px-1"
                              : "text-slate-400 px-1"
                          }
                        >
                          {line}
                        </div>
                      ))}
                    </pre>
                  </div>

                  {/* Sandbox Run Test Results */}
                  {sandboxResult && (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${sandboxResult.exit_code === 0 ? "bg-emerald-400" : "bg-red-400"}`} />
                          <h5 className="font-semibold text-white text-xs">
                            Sandbox Test Run: {sandboxResult.exit_code === 0 ? "PASSED (0 errors)" : "FAILED"}
                          </h5>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          Duration: {sandboxResult.duration_ms}ms
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {sandboxResult.tests?.map((t: any, i: number) => (
                          <div
                            key={i}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono border flex items-center gap-1.5 ${
                              t.outcome === "passed"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                : "bg-red-500/10 border-red-500/20 text-red-300"
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {t.test_id}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Human Approval Gate */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Human Approval Gate</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        No changes leave the isolated workspace without explicit user authorization.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleHumanApproval("rejected")}
                        className="px-3.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700 flex items-center gap-1.5 transition"
                      >
                        <X className="h-3.5 w-3.5" /> Discard
                      </button>
                      <button
                        onClick={() => handleHumanApproval("approved")}
                        className="px-4 py-1.5 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve & Export Patch
                      </button>
                    </div>
                  </div>

                  {approvalDecision && (
                    <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                      approvalDecision === "approved"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-red-500/10 border-red-500/20 text-red-300"
                    }`}>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Decision recorded in immutable Proof-of-Work ledger: {approvalDecision.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "battle" && (
            <div className="glass-panel rounded-xl p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Swords className="h-5 w-5 text-red-400" />
                    AI vs AI Battle Arena
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Multi-agent adversarial verification loop: Builder vs Adversarial QA vs Reviewer.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                  Module 4 • Signature Feature
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/70 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Role 1</span>
                  <h4 className="font-semibold text-white text-sm">Builder Agent</h4>
                  <p className="text-xs text-slate-400">
                    Generates proposed patch in isolated workspace based on user plan.
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-red-500/30 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Role 2</span>
                  <h4 className="font-semibold text-white text-sm">Adversarial QA</h4>
                  <p className="text-xs text-slate-400">
                    Actively challenges the patch by generating failing tests, boundary cases, and security vectors.
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Role 3</span>
                  <h4 className="font-semibold text-white text-sm">Reviewer Agent</h4>
                  <p className="text-xs text-slate-400">
                    Evaluates sandbox test outcomes, synthesizes battle report, and flags residual risks for human approval.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ledger" && (
            <div className="glass-panel rounded-xl p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-emerald-400" />
                    Cryptographic Proof-of-Work Ledger
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Immutable append-only audit trail chained by SHA-256 hashes.
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`${API_BASE}/ledger/export`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Evidence Pack
                  </a>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {ledgerEntries.map((entry) => (
                  <div key={entry.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/60 pb-2">
                      <span className="text-indigo-400 font-bold">Sequence #{entry.sequence} • {entry.event_type}</span>
                      <span className="text-slate-500 text-[11px]">{entry.created_at}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-500">Previous Hash:</span>
                        <div className="text-slate-400 truncate">{entry.prev_hash}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Content Hash:</span>
                        <div className="text-emerald-400 truncate">{entry.content_hash}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
