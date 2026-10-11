"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertTriangle, BookOpen, Loader2, MessageSquareCode } from "lucide-react";
import { ChatMessage, Citation } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.askMentor(revisionId, userText, sessionId);
      setSessionId(res.session_id);

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: "assistant",
        content: res.answer,
        grounded: res.grounded,
        citations: res.citations as Citation[],
        uncertainty_notes: res.uncertainty_notes,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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

  const quickPrompts = [
    "What are the core classes and calculation methods?",
    "Where is error handling or division by zero implemented?",
    "How are unit tests structured in this repository?",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto space-y-3">
      {/* Header Context */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(159,176,204,0.12)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[rgba(45,212,192,0.1)] text-[var(--color-teal-400)]">
            <MessageSquareCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-text-100)] font-display">
              Stage 1: Understand
            </h2>
            <p className="text-[11px] text-[var(--color-text-500)]">
              Grounded codebase mentor with verified AST citations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-text-300)] bg-[var(--color-ink-900)] px-2.5 py-1 rounded-md border border-[rgba(159,176,204,0.14)]">
          <span className="w-2 h-2 rounded-full bg-[var(--color-teal-400)]" />
          <span>AST Index Active</span>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`flex flex-col gap-1.5 ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed shadow-md ${
                msg.role === "user"
                  ? "bg-[var(--color-blue-500)] text-white font-medium"
                  : "bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.16)] text-[var(--color-text-100)] border-active-top"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Grounded Citations & Status */}
              {msg.role === "assistant" && (
                <div className="mt-3 pt-3 border-t border-[rgba(159,176,204,0.12)] flex flex-wrap items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${
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
                    <span>{msg.grounded ? "AST Verified Grounding" : "Unverified Claims Flagged"}</span>
                  </div>

                  {/* Citation pills */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {msg.citations.map((c, ci) => (
                        <button
                          key={ci}
                          onClick={() => onSelectCitation(c)}
                          className="px-2 py-0.5 rounded-md bg-[var(--color-ink-800)] hover:bg-[var(--color-ink-950)] text-[var(--color-cyan-300)] border border-[rgba(106,215,250,0.3)] text-[11px] font-mono transition-colors flex items-center gap-1.5 shadow-sm"
                          title={`Inspect snippet in ${c.path}:${c.start_line}-${c.end_line}`}
                        >
                          <BookOpen className="w-3 h-3 text-[var(--color-cyan-300)]" />
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
                <div className="mt-2 text-[11px] text-amber-300/90 font-mono italic">
                  Note: {msg.uncertainty_notes}
                </div>
              )}
            </div>

            <span className="text-[10px] text-[var(--color-text-500)] px-1 font-mono">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.14)] text-[var(--color-text-300)] text-xs max-w-sm animate-pulse">
            <Loader2 className="w-4 h-4 text-[var(--color-cyan-300)] animate-spin" />
            <span>Consulting AST syntax trees and extracting line citations...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="py-1 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] text-[var(--color-text-500)] font-mono shrink-0">Try:</span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => setInput(p)}
            className="px-3 py-1 rounded-full bg-[var(--color-ink-900)] hover:bg-[var(--color-ink-800)] border border-[rgba(159,176,204,0.14)] text-[var(--color-text-300)] hover:text-[var(--color-text-100)] text-[11px] truncate shrink-0 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* User Input Form */}
      <form onSubmit={handleSend} className="pt-1 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about classes, functions, or invariants in this project..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.18)] text-[var(--color-text-100)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-300)] placeholder-[var(--color-text-500)] font-sans"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-xl bg-[var(--color-blue-500)] hover:bg-[var(--color-sky-400)] disabled:bg-[var(--color-ink-800)] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-[rgba(7,108,211,0.3)] shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
};
