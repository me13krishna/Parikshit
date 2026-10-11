"use client";

import React from "react";
import Image from "next/image";
import { Check, Sparkles } from "lucide-react";

export type PipelineStage = "overview" | "mentor" | "tasks" | "battle" | "twin" | "ledger";

export interface StageInfo {
  id: PipelineStage;
  num: number;
  verb: string;
  noun: string;
  desc: string;
  color: string;
  colorClass: string;
}

export const PIPELINE_STAGES: StageInfo[] = [
  {
    id: "mentor",
    num: 1,
    verb: "Understand",
    noun: "Codebase Mentor",
    desc: "AST-verified code chat with file line grounding",
    color: "#2DD4C0",
    colorClass: "text-[#2DD4C0]",
  },
  {
    id: "tasks",
    num: 2,
    verb: "Change",
    noun: "Vibe Builder",
    desc: "Plan-first code synthesis with mandatory human gate",
    color: "#076CD3",
    colorClass: "text-[#076CD3]",
  },
  {
    id: "battle",
    num: 3,
    verb: "Challenge",
    noun: "AI-vs-AI Battle",
    desc: "Builder vs Adversary stress tests with Reviewer verdict",
    color: "#9390FB",
    colorClass: "text-[#9390FB]",
  },
  {
    id: "twin",
    num: 4,
    verb: "Verify",
    noun: "Checks & Twin",
    desc: "Sandboxed test execution, self-heal, & blast radius",
    color: "#6AD7FA",
    colorClass: "text-[#6AD7FA]",
  },
  {
    id: "ledger",
    num: 5,
    verb: "Prove",
    noun: "Proof-of-Work Ledger",
    desc: "Cryptographic SHA-256 hash chain evidence pack",
    color: "#AD81DB",
    colorClass: "text-[#AD81DB]",
  },
];

interface PipelineOrbitProps {
  activeStage: PipelineStage;
  completedStages?: PipelineStage[];
  onSelectStage?: (stage: PipelineStage) => void;
  variant?: "hero" | "compact";
}

export const PipelineOrbit: React.FC<PipelineOrbitProps> = ({
  activeStage,
  completedStages = [],
  onSelectStage,
  variant = "hero",
}) => {
  // Compact Header Variant
  if (variant === "compact") {
    return (
      <nav
        aria-label="Pipeline stage progress"
        className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.14)]"
      >
        <span className="text-[10px] font-mono text-[var(--color-text-500)] mr-1">Orbit:</span>
        <div className="flex items-center gap-2">
          {PIPELINE_STAGES.map((st, i) => {
            const isActive = activeStage === st.id;
            const isCompleted = completedStages.includes(st.id);
            return (
              <button
                key={st.id}
                onClick={() => onSelectStage && onSelectStage(st.id)}
                title={`${st.num}. ${st.verb} (${st.noun})`}
                aria-label={`Go to stage ${st.num}: ${st.verb}`}
                className={`group flex items-center gap-1 transition-all rounded px-1.5 py-0.5 text-xs ${
                  isActive
                    ? "bg-[rgba(106,215,250,0.12)] text-[var(--color-text-100)]"
                    : "text-[var(--color-text-500)] hover:text-[var(--color-text-300)]"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all ${
                    isActive
                      ? "ring-2 ring-[var(--color-cyan-300)] ring-offset-1 ring-offset-[var(--color-ink-950)]"
                      : isCompleted
                      ? "bg-[var(--color-teal-400)]"
                      : "bg-[rgba(159,176,204,0.25)]"
                  }`}
                  style={{
                    backgroundColor: isActive ? st.color : undefined,
                  }}
                />
                <span className={`text-[11px] font-medium hidden xl:inline ${isActive ? "text-[var(--color-text-100)]" : ""}`}>
                  {st.verb}
                </span>
                {i < PIPELINE_STAGES.length - 1 && (
                  <span className="text-[rgba(159,176,204,0.2)] ml-1 select-none">›</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Hero / Interactive Overview Variant
  return (
    <div className="relative w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col items-center">
      {/* Visual Orbit SVG & Centerpiece */}
      <div className="relative w-full max-w-[580px] aspect-[16/10] flex items-center justify-center">
        {/* SVG Orbit Track */}
        <svg
          viewBox="0 0 580 340"
          className="w-full h-full overflow-visible pointer-events-none select-none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="orbitRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2DD4C0" />
              <stop offset="25%" stopColor="#076CD3" />
              <stop offset="50%" stopColor="#2E38DE" />
              <stop offset="75%" stopColor="#9390FB" />
              <stop offset="100%" stopColor="#AD81DB" />
            </linearGradient>
            <filter id="orbGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Elliptical Orbit Arc */}
          <ellipse
            cx="290"
            cy="170"
            rx="240"
            ry="110"
            fill="none"
            stroke="url(#orbitRingGrad)"
            strokeWidth="1.75"
            strokeDasharray="6 3"
            opacity="0.45"
          />

          {/* Continuous Solid Lower Guide */}
          <ellipse
            cx="290"
            cy="170"
            rx="240"
            ry="110"
            fill="none"
            stroke="url(#orbitRingGrad)"
            strokeWidth="1.2"
            opacity="0.75"
          />
        </svg>

        {/* Centerpiece Lockup & Mission */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.2)] p-2 shadow-2xl flex items-center justify-center mb-2">
            {/* Embedded Logo Mark Image */}
            <Image
              src="/brand/mark.png"
              alt="Parikshit Mark"
              width={48}
              height={48}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xs font-semibold tracking-wider text-[var(--color-text-100)] font-display uppercase">
            5-Stage Verification Orbit
          </span>
        </div>

        {/* 5 Positioned Stage Nodes around the Ellipse */}
        {/* Ellipse coordinates at 5 angles: -160, -90, -20, 45, 135 deg */}
        {[
          { ...PIPELINE_STAGES[0], left: "10%", top: "42%" },  // Understand
          { ...PIPELINE_STAGES[1], left: "30%", top: "12%" },  // Change
          { ...PIPELINE_STAGES[2], left: "70%", top: "12%" },  // Challenge
          { ...PIPELINE_STAGES[3], left: "88%", top: "42%" },  // Verify
          { ...PIPELINE_STAGES[4], left: "50%", top: "84%" },  // Prove
        ].map((node) => {
          const isActive = activeStage === node.id;
          const isDone = completedStages.includes(node.id);

          return (
            <button
              key={node.id}
              onClick={() => onSelectStage && onSelectStage(node.id)}
              style={{ left: node.left, top: node.top }}
              aria-label={`Select stage ${node.num}: ${node.verb}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 group flex items-center gap-2 p-1.5 sm:p-2 rounded-xl transition-all ${
                isActive
                  ? "bg-[var(--color-ink-800)] ring-2 ring-[var(--color-cyan-300)] shadow-xl z-20 scale-105"
                  : "bg-[var(--color-ink-900)]/90 hover:bg-[var(--color-ink-800)] border border-[rgba(159,176,204,0.16)] hover:border-[rgba(159,176,204,0.3)] z-10"
              }`}
            >
              {/* Glowing Number Orb */}
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-display font-semibold text-xs shadow-md transition-all shrink-0"
                style={{
                  backgroundColor: isActive ? node.color : "rgba(13, 20, 48, 0.9)",
                  color: isActive ? "#00030F" : node.color,
                  border: `1px solid ${node.color}55`,
                }}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : node.num}
              </div>

              {/* Text Label */}
              <div className="text-left pr-1.5 hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-[var(--color-text-100)]">
                    {node.verb}
                  </span>
                  {isActive && <Sparkles className="w-3 h-3 text-[var(--color-cyan-300)]" />}
                </div>
                <span className="text-[10px] text-[var(--color-text-500)] block truncate max-w-[100px]">
                  {node.noun}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stage Cards Row below Orbit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full mt-6">
        {PIPELINE_STAGES.map((st) => {
          const isActive = activeStage === st.id;
          return (
            <button
              key={st.id}
              onClick={() => onSelectStage && onSelectStage(st.id)}
              className={`p-3.5 rounded-xl text-left transition-all relative ${
                isActive
                  ? "bg-[var(--color-ink-800)] border border-[rgba(159,176,204,0.25)] border-active-top shadow-lg"
                  : "bg-[var(--color-ink-900)] hover:bg-[var(--color-ink-800)]/70 border border-[rgba(159,176,204,0.12)]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[var(--color-text-500)]">
                  Stage {st.num}
                </span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: st.color }}
                />
              </div>
              <div className="text-xs font-semibold text-[var(--color-text-100)]">
                {st.verb}
              </div>
              <p className="text-[11px] text-[var(--color-text-300)] mt-0.5 line-clamp-2">
                {st.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
