"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Command,
  Sun,
  Moon,
  GitBranch,
  Settings,
} from "lucide-react";
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
  onOpenSettings?: () => void;
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
  onOpenSettings,
}) => {
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("light");
    }
    return false;
  });

  const toggleTheme = () => {
    const nextLight = !isLight;
    setIsLight(nextLight);
    if (nextLight) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      try {
        localStorage.setItem("theme", "light");
      } catch {}
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {}
    }
  };

  const isHealthy = health?.status === "ok";
  const isLedgerValid = ledgerStatus ? ledgerStatus.valid : true;
  const isMock = health?.llm_provider === "mock" || health?.llm_mode === "mock";
  const isDocker = health?.sandbox_mode === "docker" || health?.sandbox?.includes("docker");

  return (
    <header className="h-14 border-b border-[#29313D] bg-[#0B0D12]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 select-none">
      {/* Left: Project & Branch Context */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile brand indicator */}
        <div className="flex md:hidden items-center gap-2">
          <div className="w-6 h-6 rounded-md overflow-hidden bg-[#121720] p-0.5 border border-[#29313D]">
            <Image
              src="/brand/mark.png"
              alt="Parikshit Mark"
              width={24}
              height={24}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-display font-bold text-xs text-[#F4F6FA]">PARIKSHIT</span>
        </div>

        {/* Desktop Active Workspace & Branch */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#121720] border border-[#29313D] text-[#F4F6FA] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6F36B]" />
            <span className="truncate max-w-[180px]">{projectName}</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#121720] border border-[#29313D] text-[#929BAA] font-mono text-[11px]">
            <GitBranch className="w-3 h-3 text-[#5E697A]" />
            <span>main</span>
          </div>

          {revisionId && (
            <span
              className="text-[#5E697A] text-[11px] font-mono truncate max-w-[110px]"
              title={revisionId}
            >
              rev_{revisionId.slice(-6)}
            </span>
          )}
        </div>
      </div>

      {/* Center: Stage Progress Indicator */}
      <div className="hidden lg:block">
        <PipelineOrbit
          activeStage={activeStage}
          completedStages={completedStages}
          onSelectStage={onSelectStage}
          variant="compact"
        />
      </div>

      {/* Right: Search, Mode Badges, Ledger Status & Controls */}
      <div className="flex items-center gap-2">
        {/* Quick Command Palette Trigger (Ctrl+K) */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            aria-label="Open command palette (Ctrl+K)"
            className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#121720] hover:bg-[#191F2B] text-[#929BAA] hover:text-[#F4F6FA] border border-[#29313D] text-xs transition-colors"
          >
            <Command className="w-3.5 h-3.5 text-[#C6F36B]" />
            <span className="hidden sm:inline font-mono text-[11px]">Ctrl+K</span>
          </button>
        )}

        {/* Mode Indicators */}
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
            {isDocker ? "Sandbox: Docker" : "Sandbox: Host"}
          </span>
        </div>

        {/* Ledger Hash Chain Status Badge (data-testid="ledger-badge" for tests) */}
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

        {/* Backend Connectivity Status Dot */}
        <div
          className="flex items-center px-2 py-1 rounded-md bg-[#121720] border border-[#29313D]"
          title={`Backend API: ${health?.status || "connecting"} (v${health?.version || "2.0"})`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isHealthy
                ? "bg-[#39D98A] shadow-[0_0_6px_#39D98A]"
                : "bg-amber-400"
            }`}
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className="p-1.5 text-[#929BAA] hover:text-[#F4F6FA] rounded-md hover:bg-[#191F2B] border border-transparent hover:border-[#29313D] transition-colors"
          title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {isLight ? <Moon className="w-3.5 h-3.5 text-[#C6F36B]" /> : <Sun className="w-3.5 h-3.5 text-[#C6F36B]" />}
        </button>

        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            aria-label="Open settings"
            className="p-1.5 text-[#929BAA] hover:text-[#F4F6FA] rounded-md hover:bg-[#191F2B] border border-transparent hover:border-[#29313D] transition-colors hidden sm:block"
            title="Workspace Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Telemetry Refresh */}
        {onRefreshHealth && (
          <button
            onClick={onRefreshHealth}
            aria-label="Refresh telemetry health"
            className="p-1.5 text-[#929BAA] hover:text-[#F4F6FA] rounded-md hover:bg-[#191F2B] border border-transparent hover:border-[#29313D] transition-colors"
            title="Refresh telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
