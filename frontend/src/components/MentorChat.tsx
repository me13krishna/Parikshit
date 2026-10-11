"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertTriangle, BookOpen, Loader2 } from "lucide-react";
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
      content: "Hello! I am your Parikshit Grounded Mentor. Ask me anything about this repository. Every claim I make is verified against AST nodes and file lines.",
      grounded: true,
      citations: []
    }
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
      timestamp: new Date().toLocaleTimeString()
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
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        onError(err);
      } else {
        onError(new ApiClientError({
          message: err instanceof Error ? err.message : "Failed to get Mentor answer",
          code: "MENTOR_QUERY_ERROR",
          status_code: 500
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "What are the core components and duties in this service?",
    "Where is error handling or division by zero handled?",
    "Explain how tests are organized in this codebase."
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto p-4">
      {/* Message History */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`flex flex-col gap-1.5 ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "bg-cyan-600 text-white font-medium"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Grounding & Citations */}
              {msg.role === "assistant" && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                      msg.grounded
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                        : "bg-amber-950/60 text-amber-400 border-amber-800/40"
                    }`}
                  >
                    {msg.grounded ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    )}
                    <span>{msg.grounded ? "Grounded Answer" : "Ungrounded Claims Flagged"}</span>
                  </div>

                  {/* Citation pills */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {msg.citations.map((c, ci) => (
                        <button
                          key={ci}
                          onClick={() => onSelectCitation(c)}
                          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 text-[11px] font-mono transition-colors flex items-center gap-1"
                          title={`Click to view snippet: ${c.path}:${c.start_line}-${c.end_line}`}
                        >
                          <BookOpen className="w-3 h-3 text-cyan-400" />
                          <span>
                            {c.path.split("/").pop()}:{c.start_line}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {msg.uncertainty_notes && (
                <div className="mt-2 text-[10px] text-amber-300/80 italic font-mono">
                  Note: {msg.uncertainty_notes}
                </div>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 px-1 font-mono">{msg.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs max-w-xs animate-pulse">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Consulting AST & verifying citations...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="py-2 flex items-center gap-2 overflow-x-auto">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => setInput(p)}
            className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-[11px] truncate shrink-0 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form onSubmit={handleSend} className="pt-2 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about components, methods, or invariants..."
          className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm shadow-cyan-950/40"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
};
