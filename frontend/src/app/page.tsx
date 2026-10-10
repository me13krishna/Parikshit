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
  Sparkles
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

export default function ParikshitApp() {
  const [activeTab, setActiveTab] = useState<"overview" | "mentor" | "battle" | "ledger">("overview");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [gitUrl, setGitUrl] = useState<string>("https://github.com/me13krishna/Parikshit");
  const [isVerifyingLedger, setIsVerifyingLedger] = useState<boolean>(false);
  const [ledgerVerification, setLedgerVerification] = useState<{ valid: boolean; message: string } | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch health
        const resHealth = await fetch(`${API_BASE}/health`);
        if (resHealth.ok) {
          const data = await resHealth.json();
          setHealth(data.data);
        }

        // Fetch ledger entries
        const resLedger = await fetch(`${API_BASE}/ledger?limit=10`);
        if (resLedger.ok) {
          const data = await resLedger.json();
          setLedgerEntries(data.data?.entries || []);
        }
      } catch (err) {
        console.warn("Backend not reached yet:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [API_BASE]);

  const verifyLedgerChain = async () => {
    setIsVerifyingLedger(true);
    try {
      const res = await fetch(`${API_BASE}/ledger/verify`);
      if (res.ok) {
        const data = await res.json();
        setLedgerVerification(data.data);
      }
    } catch (err) {
      console.error("Verification failed:", err);
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
              {health ? health.status.toUpperCase() : "CHECKING"}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span>Database:</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {health?.database === "ok" ? "SQLite WAL" : "Unconnected"}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span>Execution:</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {health?.sandbox.includes("enabled") ? "Docker Sandboxed" : "Isolated Process"}
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
              Sprint 0 • Foundation Active
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
                    Autonomous AI Engineering Platform
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
                      Target Repository Ingestion
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Ingest any public Git repository or local codebase for AST symbol mapping and architecture analysis.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Ready to Index
                  </span>
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={gitUrl}
                      onChange={(e) => setGitUrl(e.target.value)}
                      placeholder="https://github.com/org/repo.git"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-4 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
                    onClick={() => alert(`Ready for Sprint 1 Ingestion: ${gitUrl}`)}
                  >
                    <Play className="h-4 w-4" />
                    Ingest & Index
                  </button>
                </div>
              </div>

              {/* The 5 Pillars Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-indigo-500/40 transition">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">1. Grounded Codebase Mentor</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Interactive guided tours, architecture overview, and cited Q&A validated server-side against physical line ranges.
                  </p>
                </div>

                <div className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-cyan-500/40 transition">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                    <Swords className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">2. AI vs AI Battle</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Signature multi-agent arena: Builder implements changes, Adversarial QA generates failing edge cases, and Reviewer synthesizes residual risks.
                  </p>
                </div>

                <div className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition">
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
            <div className="glass-panel rounded-xl p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-400" />
                    Codebase Mentor
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Deterministic architecture analysis with server-side citation verification.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  Module 1 • Ready for Sprint 1
                </span>
              </div>

              {/* Sample Guided Tour Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Guided Tour</span>
                  <span className="text-xs text-slate-400">Step 1 of 4</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Entry Point & API Lifecycle Flow</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  FastAPI initializes through <code className="bg-slate-800 text-indigo-300 px-1 py-0.5 rounded">backend/app/main.py</code>,
                  attaching the correlation ID middleware and triggering SQLite WAL mode and genesis ledger initialization.
                </p>

                {/* Grounded Citation Preview */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified Citation: backend/app/main.py (lines 14-25)
                    </span>
                    <span className="text-[10px] text-slate-500">sha256:d8a4...</span>
                  </div>
                  <pre className="text-slate-300 font-mono text-[11px] overflow-x-auto p-2 bg-slate-950 rounded">
{`@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Parikshit Backend Engine...")
    await init_db()`}
                  </pre>
                </div>
              </div>
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
