"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Loader2,
  MessageSquareCode,
  FileCode,
  ChevronRight,
  Folder,
} from "lucide-react";
import { ChatMessage, Citation, ArchitectureOverview, TourItem, RepoFile } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

let messageCounter = 0;
const nextMsgId = (prefix: string) => `${prefix}_${++messageCounter}`;

interface MentorChatProps {
  revisionId: string;
  projectId?: string;
  onSelectCitation: (citation: Citation) => void;
  onError: (err: ApiClientError) => void;
}

export const MentorChat: React.FC<MentorChatProps> = ({
  revisionId,
  projectId,
  onSelectCitation,
  onError,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content:
        "Welcome to Codebase Mentor. I answer architectural questions and explain invariants with verified AST grounding. Every statement is verified against indexed repository lines.",
      grounded: true,
      citations: [],
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  // Context sidebar: Architecture, Tours & Starter Tasks
  const [activeSidePanel, setActiveSidePanel] = useState<"architecture" | "tours" | "starter">("architecture");
  const [architecture, setArchitecture] = useState<ArchitectureOverview | null>(null);
  const [tours, setTours] = useState<TourItem[]>([]);
  const [starterTasks, setStarterTasks] = useState<Array<{ id: string; title: string; rationale?: string; risk_level?: string; status?: string }>>([]);
  const [repoFiles, setRepoFiles] = useState<{ name: string; lines: number; role?: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");

  // Load real files, architecture, tours & starter tasks on revisionId / projectId change
  useEffect(() => {
    let ignore = false;
    const fetchContext = async () => {
      // 1. Fetch real indexed files
      if (projectId) {
        try {
          const files = await api.getFiles(projectId);
          if (!ignore && files && files.length > 0) {
            setRepoFiles(
              files.map((f: RepoFile) => ({
                name: f.path,
                lines: f.line_count || 0,
                role: f.kind || "source",
              }))
            );
            setSelectedFile(files[0].path);
          }
        } catch {}
      }

      // 2. Fetch architecture overview
      try {
        const arch = await api.getArchitecture(revisionId || "default");
        if (!ignore && arch) {
          setArchitecture(arch);
        }
      } catch {}

      // 3. Fetch guided tours
      try {
        const trs = await api.getTours(revisionId || "default");
        if (!ignore && trs) setTours(trs);
      } catch {}

      // 4. Fetch suggested starter tasks for newcomers
      if (projectId) {
        try {
          const st = await api.getStarterTasks(projectId);
          if (!ignore && st && st.length > 0) setStarterTasks(st);
        } catch {}
      }
    };

    fetchContext();
    return () => {
      ignore = true;
    };
  }, [revisionId, projectId]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input.trim();
    if (!textToSend || loading) return;

    if (!questionText) setInput("");

    const userMsg: ChatMessage = {
      id: nextMsgId("usr"),
      role: "user",
      content: textToSend,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.askMentor(revisionId || "default", textToSend, sessionId);
      setSessionId(res.session_id);

      const assistantMsg: ChatMessage = {
        id: nextMsgId("asst"),
        role: "assistant",
        content: res.answer,
        grounded: res.grounded,
        citations: res.citations as Citation[],
        uncertainty_notes: res.uncertainty_notes,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        onError(err);
        const errMsg: ChatMessage = {
          id: nextMsgId("err"),
          role: "assistant",
          content: `Unable to query Codebase Mentor: ${err.message}. Please verify that the repository has been ingested and indexed.`,
          grounded: false,
          citations: [],
          timestamp: "Just now",
        };
        setMessages((prev) => [...prev, errMsg]);
      } else {
        const errMsg: ChatMessage = {
          id: nextMsgId("err"),
          role: "assistant",
          content: "An unexpected error occurred while processing the query against the repository index.",
          grounded: false,
          citations: [],
          timestamp: "Just now",
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } finally {
      setLoading(false);
    }
  };

  const displayFiles = repoFiles;

  const quickPrompts = [
    "What are the core classes and entry points?",
    "Where is error handling or invariant validation implemented?",
    "How are tests structured in this repository?",
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[var(--surface-2)] text-[#5E6AD2] border border-[var(--border-subtle)]">
            <MessageSquareCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-primary)] font-sans">
              Codebase Mentor
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Understand repository architecture, invariants, and call graphs with verified AST citations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-primary)] bg-[var(--surface-2)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)] self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
          <span>AST Grounding Active</span>
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-13rem)]">
        {/* Left Column: Repository File Explorer */}
        <div className="hidden lg:flex lg:col-span-3 flex-col bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl overflow-hidden p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Indexed Files ({displayFiles.length})
            </span>
            <Folder className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {displayFiles.map((file) => {
              const isSelected = selectedFile === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => {
                    setSelectedFile(file.name);
                    handleSend(`Explain the structure and invariants of ${file.name}`);
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-[var(--surface-2)] text-[#5E6AD2] border border-[var(--border-hover)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--text-primary)] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-1 font-mono">
                    {file.lines}L
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-mono">
            Click any file to trigger an architectural explanation.
          </div>
        </div>

        {/* Center Column: Conversation & Explanation Area */}
        <div className="lg:col-span-6 flex flex-col bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl overflow-hidden p-4">
          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-3">
            {messages.map((msg, i) => (
              <div
                key={msg.id || i}
                className={`flex flex-col gap-1.5 ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-xl p-3.5 text-xs leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium"
                      : "bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Grounded Citations & Status */}
                  {msg.role === "assistant" && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
                      <div
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                          msg.grounded
                            ? "bg-[#2DD4BF]/10 text-[#2DD4BF] border-[#2DD4BF]/30"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        }`}
                      >
                        {msg.grounded ? (
                          <CheckCircle2 className="w-3 h-3 text-[#2DD4BF]" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                        )}
                        <span>{msg.grounded ? "AST Verified Grounding" : "Unverified"}</span>
                      </div>

                      {/* Citation pills */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {msg.citations.map((c, ci) => (
                            <button
                              key={ci}
                              onClick={() => onSelectCitation(c)}
                              className="px-2 py-0.5 rounded bg-[var(--surface-3)] hover:opacity-90 text-[#2DD4BF] border border-[var(--border-subtle)] text-[11px] font-mono transition-opacity flex items-center gap-1.5 shadow-sm"
                              title={`Inspect code snippet in ${c.path}:${c.start_line}-${c.end_line}`}
                            >
                              <BookOpen className="w-3 h-3 text-[#2DD4BF]" />
                              <span>
                                {c.path.split("/").pop()}:{c.start_line}–{c.end_line}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.uncertainty_notes && (
                    <div className="mt-2 text-[10px] text-amber-300/90 font-mono italic">
                      Note: {msg.uncertainty_notes}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-[var(--text-muted)] px-1 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs max-w-sm animate-pulse">
                <Loader2 className="w-3.5 h-3.5 text-[#5E6AD2] animate-spin" />
                <span>Consulting AST syntax tree & line citations...</span>
              </div>
            )}
          </div>

          {/* Quick Starter Suggestions */}
          <div className="py-1.5 flex items-center gap-1.5 overflow-x-auto border-t border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">Try:</span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] truncate shrink-0 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="pt-2 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask how classes, functions, or invariants work..."
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#5E6AD2] placeholder-[var(--text-muted)]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-3.5 py-2 rounded-lg bg-[var(--text-primary)] hover:opacity-90 disabled:opacity-40 text-[var(--bg-primary)] text-xs font-semibold flex items-center gap-1 transition-opacity shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>

        {/* Right Column: Architecture & Code Tours Context Panel */}
        <div className="hidden lg:flex lg:col-span-3 flex-col bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl overflow-hidden p-3.5 space-y-3">
          {/* Tab switch */}
          <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveSidePanel("architecture")}
              className={`flex-1 py-1 text-[10px] rounded font-medium transition-colors ${
                activeSidePanel === "architecture"
                  ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => setActiveSidePanel("tours")}
              className={`flex-1 py-1 text-[10px] rounded font-medium transition-colors ${
                activeSidePanel === "tours"
                  ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Tours
            </button>
            <button
              onClick={() => setActiveSidePanel("starter")}
              className={`flex-1 py-1 text-[10px] rounded font-medium transition-colors ${
                activeSidePanel === "starter"
                  ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Starter Tasks
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 text-xs">
            {activeSidePanel === "architecture" ? (
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">
                  Core Components
                </span>
                {architecture?.components && architecture.components.length > 0 ? (
                  architecture.components.map((c, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1"
                    >
                      <div className="font-semibold text-[var(--text-primary)] text-xs">{c.name}</div>
                      <p className="text-[11px] text-[var(--text-secondary)]">{c.responsibility}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-lg bg-[var(--surface-2)]/40 border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                    Components will be automatically synthesized from repository AST once indexed.
                  </div>
                )}
              </div>
            ) : activeSidePanel === "tours" ? (
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">
                  User Journey Tours
                </span>
                {tours && tours.length > 0 ? (
                  tours.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5"
                    >
                      <div className="font-semibold text-[var(--text-primary)] text-xs">{t.title}</div>
                      <p className="text-[11px] text-[var(--text-secondary)]">{t.description}</p>
                      <div className="space-y-1 pt-1">
                        {t.steps?.map((st, si) => (
                          <div key={si} className="text-[10px] font-mono text-[var(--text-muted)]">
                            Step {st.step_number}: {st.title} ({st.path})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1">
                    <div className="font-semibold text-[var(--text-primary)] text-xs">
                      Arithmetic Calculation Flow
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Trace request from client input to operation parser and exception assertion.
                    </p>
                    <button
                      onClick={() => handleSend("Trace the arithmetic calculation user journey")}
                      className="text-[10px] text-[#5E6AD2] hover:underline flex items-center gap-1 pt-1 font-mono"
                    >
                      <span>Start Tour</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">
                  Newcomer Starter Tasks
                </span>
                {starterTasks && starterTasks.length > 0 ? (
                  starterTasks.map((st) => (
                    <div
                      key={st.id}
                      className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-[var(--text-primary)] text-xs leading-tight">
                          {st.title}
                        </div>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-950/60 text-[#34D399] border border-emerald-800/40 shrink-0 font-bold">
                          {st.risk_level || "low"}
                        </span>
                      </div>
                      {st.rationale && (
                        <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                          {st.rationale}
                        </p>
                      )}
                      <button
                        onClick={() => handleSend(`How do I complete starter task: "${st.title}"? Please cite the exact files and lines.`)}
                        className="text-[10px] text-[#5E6AD2] hover:underline flex items-center gap-1 pt-1 font-mono"
                      >
                        <span>Explain in Chat</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5">
                      <div className="font-semibold text-[var(--text-primary)] text-xs">
                        Explore Entrypoints & Invariants
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Learn core module responsibilities and exception invariants.
                      </p>
                      <button
                        onClick={() => handleSend("Explain key codebase entrypoints for a new contributor with exact line citations")}
                        className="text-[10px] text-[#5E6AD2] hover:underline flex items-center gap-1 pt-1 font-mono"
                      >
                        <span>Start Task</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
