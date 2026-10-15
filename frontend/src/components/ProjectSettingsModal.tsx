"use client";

import React, { useState } from "react";
import { X, Settings, Check } from "lucide-react";
import { HealthData, LedgerVerifyResult } from "../lib/types";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthData | null;
  ledgerStatus: LedgerVerifyResult | null;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  health,
  ledgerStatus,
}) => {
  const [activeTab, setActiveTab] = useState<"settings" | "docs">("settings");

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workspace settings and documentation"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#121720] border border-[#29313D] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border-active-top">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#29313D]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#0B0D12] text-[#C6F36B] border border-[#29313D]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold font-display text-[#F4F6FA]">
                Workspace Settings & Architecture
              </h3>
              <p className="text-[11px] text-[#929BAA]">
                Parikshit AI Engineering Cockpit v{health?.version || "2.0"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#929BAA] hover:text-[#F4F6FA] hover:bg-[#191F2B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 bg-[#0B0D12] p-1 rounded-lg border border-[#29313D] text-xs">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-1 rounded font-medium transition-colors ${
              activeTab === "settings"
                ? "bg-[#191F2B] text-[#C6F36B] font-semibold"
                : "text-[#929BAA] hover:text-[#F4F6FA]"
            }`}
          >
            System Status
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`flex-1 py-1 rounded font-medium transition-colors ${
              activeTab === "docs"
                ? "bg-[#191F2B] text-[#C6F36B] font-semibold"
                : "text-[#929BAA] hover:text-[#F4F6FA]"
            }`}
          >
            Architecture Principles
          </button>
        </div>

        {/* Content */}
        {activeTab === "settings" ? (
          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] flex items-center justify-between">
              <span className="text-[#929BAA]">Backend Service:</span>
              <span className="text-[#39D98A] font-semibold">
                {health?.status === "ok" ? "Connected (Healthy)" : "Connecting..."}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] flex items-center justify-between">
              <span className="text-[#929BAA]">LLM Provider & Mode:</span>
              <span className="text-[#C6F36B] font-semibold">
                {health?.llm_provider || "mock"} ({health?.llm_mode || "mock"})
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] flex items-center justify-between">
              <span className="text-[#929BAA]">Sandbox Execution Box:</span>
              <span className="text-[#F4F6FA]">
                {health?.sandbox_mode || "Docker"} ({health?.sandbox || "ready"})
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] flex items-center justify-between">
              <span className="text-[#929BAA]">Cryptographic Ledger Chain:</span>
              <span className={ledgerStatus?.valid ? "text-[#39D98A]" : "text-[#FB7185]"}>
                {ledgerStatus?.valid ? "Verified & Intact" : "Broken / Unverified"}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1">
              <div className="font-semibold text-[#C6F36B] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>1. Understand (AST-Grounded Mentor)</span>
              </div>
              <p className="text-[11px] text-[#929BAA]">
                Every chat explanation links to verified AST syntax trees, line ranges, and cryptographic snippet hashes.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1">
              <div className="font-semibold text-[#39D98A] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>2. Build & Human Approval Gate</span>
              </div>
              <p className="text-[11px] text-[#929BAA]">
                Code generation is plan-first and sandboxed. Developers must explicitly approve before any patch applies to source files.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1">
              <div className="font-semibold text-[#9390FB] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>3. Challenge (Adversary Battle Arena)</span>
              </div>
              <p className="text-[11px] text-[#929BAA]">
                An independent Adversary Agent challenges modifications with aggressive edge tests, verified by an impartial Reviewer Agent.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#0B0D12] border border-[#29313D] space-y-1">
              <div className="font-semibold text-[#C6F36B] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>4. Verify & Prove (Immutable Ledger)</span>
              </div>
              <p className="text-[11px] text-[#929BAA]">
                Every single event is sealed into a SHA-256 forward and backward hash chain. Tampering breaks the chain immediately.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-[#29313D]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#191F2B] hover:bg-[#222B3D] text-[#F4F6FA] text-xs font-semibold border border-[#29313D]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
