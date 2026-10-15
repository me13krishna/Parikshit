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
    color: "#C6F36B",
    colorClass: "text-[#C6F36B]",
  },
  {
    id: "tasks",
    num: 2,
    verb: "Build",
    noun: "AI Coding Agent",
    desc: "Plan-first code synthesis with mandatory human gate",
    color: "#39D98A",
    colorClass: "text-[#39D98A]",
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
    color: "#39D98A",
    colorClass: "text-[#39D98A]",
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
        className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121720] border border-[#29313D]"
      >
        <span className="text-[10px] font-mono text-[#5E697A] mr-1">Orbit:</span>
        <div className="flex items-center gap-1.5">
          {PIPELINE_STAGES.map((st, i) => {
            const isActive = activeStage === st.id;
            const isCompleted = completedStages.includes(st.id);
            return (
              <button
                key={st.id}
                onClick={() => onSelectStage && onSelectStage(st.id)}
                title={`${st.num}. ${st.verb} (${st.noun})`}
                aria-label={`Go to stage ${st.num}: ${st.verb}`}
                className={`group flex items-center gap-1.5 transition-all rounded px-2 py-0.5 text-xs ${
                  isActive
                    ? "bg-[#191F2B] text-[#F4F6FA] border border-[#29313D]"
                    : "text-[#929BAA] hover:text-[#F4F6FA]"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all ${
                    isActive
                      ? "bg-[#C6F36B] shadow-[0_0_6px_#C6F36B]"
                      : isCompleted
                      ? "bg-[#39D98A]"
                      : "bg-[#29313D]"
                  }`}
                />
                <span className={`text-[11px] font-medium hidden xl:inline ${isActive ? "text-[#C6F36B] font-semibold" : ""}`}>
                  {st.verb}
                </span>
                {i < PIPELINE_STAGES.length - 1 && (
                  <span className="text-[#29313D] ml-1 select-none">›</span>
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
    <div className="relative w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col items-center select-none">
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
              <stop offset="0%" stopColor="#C6F36B" />
              <stop offset="35%" stopColor="#39D98A" />
              <stop offset="70%" stopColor="#076CD3" />
              <stop offset="100%" stopColor="#C6F36B" />
            </linearGradient>
          </defs>

          {/* Elliptical Orbit Arc */}
          <ellipse
            cx="290"
            cy="170"
            rx="240"
            ry="110"
            fill="none"
            stroke="url(#orbitRingGrad)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.35"
          />

          <ellipse
            cx="290"
            cy="170"
            rx="240"
            ry="110"
            fill="none"
            stroke="url(#orbitRingGrad)"
            strokeWidth="1"
            opacity="0.6"
          />
        </svg>

        {/* Centerpiece Lockup */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <div className="w-11 h-11 rounded-xl bg-[#0B0D12] border border-[#29313D] p-2 shadow-2xl flex items-center justify-center mb-1.5">
            <Image
              src="/brand/mark.png"
              alt="Parikshit Mark"
              width={40}
              height={40}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[11px] font-mono font-semibold tracking-wider text-[#C6F36B] uppercase">
            5-Stage Verification Loop
          </span>
        </div>

        {/* 5 Positioned Stage Nodes */}
        {[
          { ...PIPELINE_STAGES[0], left: "10%", top: "42%" },  // Understand
          { ...PIPELINE_STAGES[1], left: "30%", top: "14%" },  // Build
          { ...PIPELINE_STAGES[2], left: "70%", top: "14%" },  // Challenge
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
                  ? "bg-[#191F2B] ring-2 ring-[#C6F36B] shadow-2xl z-20 scale-105"
                  : "bg-[#121720] hover:bg-[#191F2B] border border-[#29313D] hover:border-[#3B4656] z-10"
              }`}
            >
              {/* Orb Number */}
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-display font-semibold text-xs shadow-md transition-all shrink-0"
                style={{
                  backgroundColor: isActive ? "#C6F36B" : "#0B0D12",
                  color: isActive ? "#0B0D12" : "#C6F36B",
                  border: `1px solid ${isActive ? "#C6F36B" : "#29313D"}`,
                }}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : node.num}
              </div>

              {/* Text Label */}
              <div className="text-left pr-1.5 hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold ${isActive ? "text-[#C6F36B]" : "text-[#F4F6FA]"}`}>
                    {node.verb}
                  </span>
                  {isActive && <Sparkles className="w-3 h-3 text-[#C6F36B]" />}
                </div>
                <span className="text-[10px] text-[#929BAA] block truncate max-w-[95px]">
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
              className={`p-3 rounded-xl text-left transition-all ${
                isActive
                  ? "bg-[#191F2B] border border-[#C6F36B]/60 shadow-lg"
                  : "bg-[#121720] hover:bg-[#191F2B] border border-[#29313D]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#5E697A]">
                  Stage {st.num}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: st.color }}
                />
              </div>
              <div className={`text-xs font-semibold ${isActive ? "text-[#C6F36B]" : "text-[#F4F6FA]"}`}>
                {st.verb}
              </div>
              <p className="text-[11px] text-[#929BAA] mt-0.5 line-clamp-2">
                {st.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
