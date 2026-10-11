"use client";

import React from "react";
import Image from "next/image";
import { ShieldCheck, ShieldAlert, RefreshCw, Command } from "lucide-react";
import { HealthData, LedgerVerifyResult } from "../lib/types";
import { PipelineOrbit, PipelineStage } from "./PipelineOrbit";

interface HeaderProps {
  health: HealthData | null;
  projectName?: string;
  revisionId?: string;
  ledgerStatus?: LedgerVerifyResult | null;
  activeStage?: PipelineStage;
  completedStages?: PipelineStage[];
  onSelectStage?: (stage: PipelineStage) => void;
  onRefreshHealth?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  projectName = "Demo Calculator Service",
  revisionId,
  ledgerStatus,
  activeStage = "overview",
  completedStages = [],
  onSelectStage,
  onRefreshHealth,
  onOpenCommandPalette,
}) => {
  const isHealthy = health?.status === "ok";
  const isLedgerValid = ledgerStatus ? ledgerStatus.valid : true;
  const isMock = health?.llm_provider === "mock" || health?.llm_mode === "mock";
  const isDocker = health?.sandbox_mode === "docker" || health?.sandbox?.includes("docker");

  return (
    <header className="h-16 border-b border-[rgba(159,176,204,0.14)] bg-[var(--color-ink-950)]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
      {/* Brand Lockup & Project Context */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Compact Logo Lockup with clear space */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-0.5">
            <Image
              src="/brand/mark.png"
              alt="Parikshit Mark"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm tracking-wide text-[var(--color-text-100)]">
                PARIKSHIT
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-ink-800)] text-[var(--color-text-300)] border border-[rgba(159,176,204,0.18)]">
                v{health?.version || "2.0"}
              </span>
            </div>
            <span className="text-[10px] text-[var(--color-text-500)] hidden sm:inline">
              Grounded AI Engineering Teammate
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-[rgba(159,176,204,0.15)] hidden md:block" />

        {/* Project Context & Revision */}
        <div className="hidden md:flex items-center gap-2 font-mono text-xs">
          <span className="text-[var(--color-text-500)]">Project:</span>
          <span className="text-[var(--color-text-100)] font-medium px-2.5 py-0.5 rounded-md bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.16)]">
            {projectName}
          </span>
          {revisionId && (
            <>
              <span className="text-[var(--color-text-500)]">/</span>
              <span
                className="text-[var(--color-text-300)] text-[11px] truncate max-w-[140px]"
                title={revisionId}
              >
                rev_{revisionId.slice(-8)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Center: Compact Pipeline Orbit Indicator */}
      <PipelineOrbit
        activeStage={activeStage}
        completedStages={completedStages}
        onSelectStage={onSelectStage}
        variant="compact"
      />

      {/* Right: Telemetry Badges, Command Palette Trigger, & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            aria-label="Open command palette (Ctrl+K)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-ink-900)] hover:bg-[var(--color-ink-800)] text-[var(--color-text-300)] hover:text-[var(--color-text-100)] border border-[rgba(159,176,204,0.16)] text-xs transition-colors"
          >
            <Command className="w-3.5 h-3.5 text-[var(--color-cyan-300)]" />
            <span className="hidden sm:inline font-mono text-[11px]">Ctrl+K</span>
          </button>
        )}

        {/* Mode Badges (LLM Mode & Sandbox Mode) */}
        <div className="hidden xl:flex items-center gap-1.5 font-mono text-[11px]">
          {/* LLM Mode */}
          <span
            className={`px-2 py-0.5 rounded-md border ${
              isMock
                ? "bg-amber-950/40 text-amber-300 border-amber-800/40"
                : "bg-blue-950/40 text-blue-300 border-blue-800/40"
            }`}
            title={isMock ? "Mock Mode: Deterministic synthetic generation" : "Live LLM Provider"}
          >
            {isMock ? "LLM: Mock" : "LLM: Live"}
          </span>

          {/* Sandbox Mode */}
          <span
            className={`px-2 py-0.5 rounded-md border ${
              isDocker
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
                : "bg-rose-950/40 text-rose-300 border-rose-800/40"
            }`}
            title={isDocker ? "Isolated Docker container sandbox" : "Host runner unsandboxed mode"}
          >
            {isDocker ? "Box: Docker" : "Box: Host"}
          </span>
        </div>

        {/* Ledger Hash Chain Status Badge (Compatible with tests: data-testid="ledger-badge") */}
        <div
          data-testid="ledger-badge"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
            isLedgerValid
              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
              : "bg-red-950/60 text-red-300 border-red-700/60 animate-pulse"
          }`}
          title={
            isLedgerValid
              ? "Cryptographic Ledger Verified: All hash chains intact"
              : `Ledger Broken at Sequence #${ledgerStatus?.broken_at_sequence ?? "unknown"}`
          }
        >
          {isLedgerValid ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className="hidden sm:inline font-medium">
            {isLedgerValid ? "Chain Verified" : "Chain Broken"}
          </span>
        </div>

        {/* Health status dot */}
        <div
          className="flex items-center px-2 py-1 rounded-md bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.14)]"
          title={`Backend status: ${health?.status || "connecting"}`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isHealthy
                ? "bg-[var(--color-teal-400)] shadow-[0_0_8px_var(--color-teal-400)]"
                : "bg-amber-400"
            }`}
          />
        </div>

        {/* Telemetry Refresh */}
        {onRefreshHealth && (
          <button
            onClick={onRefreshHealth}
            aria-label="Refresh telemetry health"
            className="p-1.5 text-[var(--color-text-500)] hover:text-[var(--color-text-100)] rounded-md hover:bg-[var(--color-ink-800)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
