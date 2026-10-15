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
import { ChatMessage, Citation, ArchitectureOverview, TourItem } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

let messageCounter = 0;
const nextMsgId = (prefix: string) => `${prefix}_${++messageCounter}`;

interface MentorChatProps {
  revisionId: string;
  onSelectCitation: (citation: Citation) => void;
  onError: (err: ApiClientError) => void;
}

export const MentorChat: React.FC<MentorChatProps> = ({ revisionId, onSelectCitation, onError }) => {
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

  // Context sidebar: Architecture & Tours
  const [activeSidePanel, setActiveSidePanel] = useState<"architecture" | "tours">("architecture");
  const [architecture, setArchitecture] = useState<ArchitectureOverview | null>(null);
  const [tours, setTours] = useState<TourItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");

  // Load architecture & tours on revisionId change
  useEffect(() => {
    let ignore = false;
    const fetchContext = async () => {
      try {
        const arch = await api.getArchitecture(revisionId || "default");
        if (!ignore) {
          setArchitecture(arch);
          if (arch?.components?.[0]?.files?.[0]) {
            setSelectedFile(arch.components[0].files[0]);
          }
        }
      } catch {}
      try {
        const trs = await api.getTours(revisionId || "default");
        if (!ignore) setTours(trs);
      } catch {}
    };
    fetchContext();
    return () => {
      ignore = true;
    };
  }, [revisionId]);

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
      } else {
        onError(
          new ApiClientError({
            message: err instanceof Error ? err.message : "Failed to obtain mentor answer",
            code: "MENTOR_QUERY_ERROR",
            status_code: 500,
          })
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const sampleFiles = [
    { name: "calculator.py", lines: 45, role: "Core operations" },
    { name: "tests/test_calculator.py", lines: 60, role: "Pytest unit tests" },
    { name: "api/routes.py", lines: 32, role: "HTTP endpoints" },
  ];

  const quickPrompts = [
    "What are the core classes and calculation methods?",
    "Where is error handling or division by zero implemented?",
    "How are unit tests structured in this repository?",
    "Suggest beginner-friendly starter issues",
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#29313D]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#191F2B] text-[#C6F36B] border border-[#29313D]">
            <MessageSquareCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#F4F6FA] font-display">
              Codebase Mentor
            </h2>
            <p className="text-[11px] text-[#929BAA]">
              Understand repository architecture, invariants, and call graphs with verified AST citations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-[#F4F6FA] bg-[#121720] px-2.5 py-1 rounded-md border border-[#29313D]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#39D98A] shadow-[0_0_6px_#39D98A]" />
          <span>AST Grounding Active</span>
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-12rem)]">
        {/* Left Column: Repository File Explorer */}
        <div className="hidden lg:flex lg:col-span-3 flex-col bg-[#121720] border border-[#29313D] rounded-xl overflow-hidden p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#29313D]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#5E697A] font-semibold">
              Indexed Files
            </span>
            <Folder className="w-3.5 h-3.5 text-[#5E697A]" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {sampleFiles.map((file) => {
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
                      ? "bg-[#191F2B] text-[#C6F36B] border border-[#29313D]"
                      : "text-[#929BAA] hover:bg-[#191F2B]/60 hover:text-[#F4F6FA] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-[#5E697A] shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-[#5E697A] shrink-0 ml-1 font-sans">
                    {file.lines}L
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#29313D] text-[10px] text-[#5E697A]">
            Click any file to trigger an architectural explanation.
          </div>
        </div>

        {/* Center Column: Conversation & Explanation Area */}
        <div className="lg:col-span-6 flex flex-col bg-[#121720] border border-[#29313D] rounded-xl overflow-hidden p-4">
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
                      ? "bg-[#191F2B] text-[#F4F6FA] border border-[#29313D] font-medium"
                      : "bg-[#0B0D12] border border-[#29313D] text-[#F4F6FA]"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Grounded Citations & Status */}
                  {msg.role === "assistant" && (
                    <div className="mt-3 pt-3 border-t border-[#29313D] flex flex-wrap items-center gap-2">
                      <div
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                          msg.grounded
                            ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
                            : "bg-amber-950/40 text-amber-300 border-amber-800/40"
                        }`}
                      >
                        {msg.grounded ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
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
                              className="px-2 py-0.5 rounded bg-[#191F2B] hover:bg-[#222B3D] text-[#C6F36B] border border-[#29313D] text-[11px] font-mono transition-colors flex items-center gap-1.5 shadow-sm"
                              title={`Inspect code snippet in ${c.path}:${c.start_line}-${c.end_line}`}
                            >
                              <BookOpen className="w-3 h-3 text-[#C6F36B]" />
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

                <span className="text-[10px] text-[#5E697A] px-1 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] text-[#929BAA] text-xs max-w-sm animate-pulse">
                <Loader2 className="w-3.5 h-3.5 text-[#C6F36B] animate-spin" />
                <span>Consulting AST syntax tree & line citations...</span>
              </div>
            )}
          </div>

          {/* Quick Starter Suggestions */}
          <div className="py-1.5 flex items-center gap-1.5 overflow-x-auto border-t border-[#29313D]">
            <span className="text-[10px] text-[#5E697A] font-mono shrink-0">Try:</span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="px-2.5 py-0.5 rounded-full bg-[#191F2B] hover:bg-[#222B3D] border border-[#29313D] text-[#929BAA] hover:text-[#F4F6FA] text-[10px] truncate shrink-0 transition-colors"
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
              className="flex-1 px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#29313D] text-[#F4F6FA] text-xs focus:outline-none focus:border-[#C6F36B] placeholder-[#5E697A]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-3.5 py-2 rounded-lg bg-[#C6F36B] hover:bg-[#b5e655] disabled:opacity-40 text-[#0B0D12] text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>

        {/* Right Column: Architecture & Code Tours Context Panel */}
        <div className="hidden lg:flex lg:col-span-3 flex-col bg-[#121720] border border-[#29313D] rounded-xl overflow-hidden p-3.5 space-y-3">
          {/* Tab switch */}
          <div className="flex items-center gap-1 bg-[#0B0D12] p-1 rounded-lg border border-[#29313D]">
            <button
              onClick={() => setActiveSidePanel("architecture")}
              className={`flex-1 py-1 text-[11px] rounded font-medium transition-colors ${
                activeSidePanel === "architecture"
                  ? "bg-[#191F2B] text-[#C6F36B] font-semibold"
                  : "text-[#929BAA] hover:text-[#F4F6FA]"
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => setActiveSidePanel("tours")}
              className={`flex-1 py-1 text-[11px] rounded font-medium transition-colors ${
                activeSidePanel === "tours"
                  ? "bg-[#191F2B] text-[#C6F36B] font-semibold"
                  : "text-[#929BAA] hover:text-[#F4F6FA]"
              }`}
            >
              Code Tours
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 text-xs">
            {activeSidePanel === "architecture" ? (
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase text-[#5E697A] block">
                  Core Components
                </span>
                {architecture?.components && architecture.components.length > 0 ? (
                  architecture.components.map((c, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1"
                    >
                      <div className="font-semibold text-[#F4F6FA] text-xs">{c.name}</div>
                      <p className="text-[11px] text-[#929BAA]">{c.responsibility}</p>
                    </div>
                  ))
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1">
                      <div className="font-semibold text-[#F4F6FA] text-xs">CalculatorService</div>
                      <p className="text-[11px] text-[#929BAA]">
                        Executes arithmetic calculations and enforces division invariants.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1">
                      <div className="font-semibold text-[#F4F6FA] text-xs">TestRunnerSuite</div>
                      <p className="text-[11px] text-[#929BAA]">
                        Validates edge cases, input typing, and exception handling.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase text-[#5E697A] block">
                  User Journey Tours
                </span>
                {tours && tours.length > 0 ? (
                  tours.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1.5"
                    >
                      <div className="font-semibold text-[#C6F36B] text-xs">{t.title}</div>
                      <p className="text-[11px] text-[#929BAA]">{t.description}</p>
                      <div className="space-y-1 pt-1">
                        {t.steps?.map((st, si) => (
                          <div key={si} className="text-[10px] font-mono text-[#5E697A]">
                            Step {st.step_number}: {st.title} ({st.path})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1">
                    <div className="font-semibold text-[#C6F36B] text-xs">
                      Arithmetic Calculation Flow
                    </div>
                    <p className="text-[11px] text-[#929BAA]">
                      Trace request from client input to operation parser and exception assertion.
                    </p>
                    <button
                      onClick={() => handleSend("Trace the arithmetic calculation user journey")}
                      className="text-[10px] text-[#C6F36B] hover:underline flex items-center gap-1 pt-1 font-mono"
                    >
                      <span>Start Tour</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
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
