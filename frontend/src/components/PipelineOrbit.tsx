"use client";

import React from "react";
import { Check, Search, Code2, Swords, ShieldCheck, Link } from "lucide-react";

export type PipelineStage = "overview" | "mentor" | "tasks" | "battle" | "twin" | "ledger";

export interface StageInfo {
  id: PipelineStage;
  num: number;
  verb: string;
  noun: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PIPELINE_STAGES: StageInfo[] = [
  {
    id: "mentor",
    num: 1,
    verb: "Understand",
    noun: "Codebase Mentor",
    desc: "AST-index every file. Tree-sitter parse trees. No hallucination source allowed.",
    icon: Search,
  },
  {
    id: "tasks",
    num: 2,
    verb: "Build",
    noun: "AI Coding Agent",
    desc: "Context-grounded code generation. Only verified imports. Typed signatures only.",
    icon: Code2,
  },
  {
    id: "battle",
    num: 3,
    verb: "Challenge",
    noun: "AI Code Battle",
    desc: "Autonomous red-team. Adversarial agents probe every assumption before shipping.",
    icon: Swords,
  },
  {
    id: "twin",
    num: 4,
    verb: "Verify",
    noun: "Checks & Twin",
    desc: "Test execution + AST diff validation. Every change is deterministically auditable.",
    icon: ShieldCheck,
  },
  {
    id: "ledger",
    num: 5,
    verb: "Prove",
    noun: "Proof-of-Work Ledger",
    desc: "SHA-256 Proof-of-Work ledger. Cryptographic tamper-proof trail of every action.",
    icon: Link,
  },
];

interface PipelineOrbitProps {
  activeStage: PipelineStage;
  completedStages?: PipelineStage[];
  onSelectStage?: (stage: PipelineStage) => void;
  /** "hero" = full 5-card panel row | "compact" = slim pill strip */
  variant?: "hero" | "compact";
}

/* ─── Compact header variant (slim pill strip) ─────────────────────────── */
export const PipelineOrbit: React.FC<PipelineOrbitProps> = ({
  activeStage,
  completedStages = [],
  onSelectStage,
  variant = "hero",
}) => {
  if (variant === "compact") {
    return (
      <nav
        aria-label="Pipeline stage progress"
        className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-full"
        style={{ border: "1px solid var(--border-subtle)", background: "var(--surface-1)" }}
      >
        {PIPELINE_STAGES.map((st, i) => {
          const isActive = activeStage === st.id;
          const isDone = completedStages.includes(st.id);
          return (
            <React.Fragment key={st.id}>
              <button
                onClick={() => onSelectStage?.(st.id)}
                title={`${st.num}. ${st.verb} (${st.noun})`}
                aria-label={`Go to stage ${st.num}: ${st.verb}`}
                aria-current={isActive ? "step" : undefined}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all"
                style={{
                  background: isActive ? "rgba(94,106,210,0.10)" : "transparent",
                  color: isActive ? "#818CF8" : isDone ? "#34D399" : "var(--text-muted)",
                  border: isActive ? "1px solid rgba(94,106,210,0.35)" : "1px solid transparent",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: isActive ? "#818CF8" : isDone ? "#34D399" : "var(--border-md)",
                    boxShadow: isActive ? "0 0 6px rgba(129,140,248,0.6)" : "none",
                  }}
                />
                <span className="hidden xl:inline">{st.verb}</span>
              </button>
              {i < PIPELINE_STAGES.length - 1 && (
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>›</span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    );
  }

  /* ─── Hero 5-card panel variant ───────────────────────────────────────── */
  return (
    <div className="w-full">
      {/* Section label */}
      <p
        className="text-center text-xs mb-6 tracking-widest uppercase"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
      >
        The 5-Stage Engineering Loop
      </p>

      {/* 5 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 stagger">
        {PIPELINE_STAGES.map((st) => {
          const isActive = activeStage === st.id;
          const isDone = completedStages.includes(st.id);
          const Icon = st.icon;

          return (
            <button
              key={st.id}
              onClick={() => onSelectStage?.(st.id)}
              aria-label={`Select stage ${st.num}: ${st.verb}`}
              aria-current={isActive ? "step" : undefined}
              className="group relative flex flex-col items-center text-center p-5 rounded-xl transition-all animate-fade-up"
              style={{
                background: isActive ? "rgba(94,106,210,0.06)" : "var(--surface-1)",
                border: isActive
                  ? "1px solid rgba(94,106,210,0.45)"
                  : "1px solid var(--border-subtle)",
                cursor: "pointer",
              }}
            >
              {/* Step number */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-all"
                style={{
                  background: isActive
                    ? "rgba(94,106,210,0.15)"
                    : isDone
                    ? "rgba(52,211,153,0.10)"
                    : "var(--surface-2)",
                  border: isActive
                    ? "1px solid rgba(94,106,210,0.4)"
                    : "1px solid var(--border-subtle)",
                  color: isActive ? "#818CF8" : isDone ? "#34D399" : "var(--text-muted)",
                }}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Step number label */}
              <span
                className="text-[10px] mb-0.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: isActive ? "rgba(129,140,248,0.7)" : "var(--text-muted)",
                }}
              >
                {String(st.num).padStart(2, "0")}
              </span>

              {/* Verb */}
              <span
                className="text-sm font-semibold mb-1.5 leading-tight"
                style={{
                  color: isActive ? "#818CF8" : "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {st.verb}
              </span>

              {/* Description */}
              <p
                className="text-[11px] leading-relaxed line-clamp-3"
                style={{ color: "var(--text-secondary)" }}
              >
                {st.desc}
              </p>

              {/* Active indigo corner accent */}
              {isActive && (
                <span
                  className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: "#818CF8", boxShadow: "0 0 8px rgba(129,140,248,0.8)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer caption */}
      <p
        className="text-center text-xs mt-5"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
      >
        Grounded · Adversarial · Verified · Sealed
      </p>
    </div>
  );
};
