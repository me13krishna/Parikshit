"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  MessageSquareCode,
  Hammer,
  Swords,
  ShieldCheck,
  History,
  ChevronLeft,
  ChevronRight,
  X,
  FileCode,
} from "lucide-react";

export type NavTab = "ingest" | "mentor" | "tasks" | "battle" | "twin" | "ledger";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  projectName?: string;
  revisionId?: string;
}

export interface NavItemConfig {
  id: NavTab;
  stageNum?: number;
  verb: string;
  noun: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: "ingest",
    verb: "Overview",
    noun: "Hero & Ingest",
    desc: "Project dashboard & demo loader",
    icon: LayoutDashboard,
    accentColor: "var(--color-sky-400)",
  },
  {
    id: "mentor",
    stageNum: 1,
    verb: "Understand",
    noun: "Codebase Mentor",
    desc: "Grounded chat with AST line citations",
    icon: MessageSquareCode,
    accentColor: "var(--color-teal-400)",
  },
  {
    id: "tasks",
    stageNum: 2,
    verb: "Change",
    noun: "Vibe Builder",
    desc: "Task planning, diff, and human gate",
    icon: Hammer,
    accentColor: "var(--color-blue-500)",
  },
  {
    id: "battle",
    stageNum: 3,
    verb: "Challenge",
    noun: "AI-vs-AI Battle",
    desc: "Builder vs Adversary stress test arena",
    icon: Swords,
    accentColor: "var(--color-violet-400)",
  },
  {
    id: "twin",
    stageNum: 4,
    verb: "Verify",
    noun: "Checks & Digital Twin",
    desc: "Sandbox execution, self-heal & blast radius",
    icon: ShieldCheck,
    accentColor: "var(--color-cyan-300)",
  },
  {
    id: "ledger",
    stageNum: 5,
    verb: "Prove",
    noun: "Proof-of-Work Ledger",
    desc: "SHA-256 hash-chained tamper audit",
    icon: History,
    accentColor: "var(--color-lavender-300)",
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  projectName = "Demo Calculator",
  revisionId,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const renderNavButtons = (isCompact = false) => (
    <div className="flex flex-col gap-1.5 w-full">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => {
              onTabChange(item.id);
              setMobileDrawerOpen(false);
            }}
            title={`${item.verb} – ${item.noun}: ${item.desc}`}
            aria-label={`${item.verb}: ${item.noun}`}
            className={`group relative flex items-center ${
              isCompact ? "justify-center p-2.5" : "justify-between px-3.5 py-2.5"
            } rounded-xl text-xs font-medium transition-all ${
              isActive
                ? "bg-[rgba(106,215,250,0.12)] text-[var(--color-text-100)] border border-[rgba(106,215,250,0.3)] shadow-sm shadow-[rgba(0,3,15,0.4)]"
                : "text-[var(--color-text-300)] hover:text-[var(--color-text-100)] hover:bg-[var(--color-ink-800)]/70 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                  isActive
                    ? "bg-[var(--color-ink-800)] text-[var(--color-cyan-300)]"
                    : "text-[var(--color-text-500)] group-hover:text-[var(--color-text-300)]"
                }`}
                style={{
                  color: isActive ? item.accentColor : undefined,
                }}
              >
                <Icon className="w-4 h-4" />
              </div>

              {!isCompact && (
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[var(--color-text-100)] leading-tight">
                      {item.verb}
                    </span>
                    {item.stageNum && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-ink-950)] text-[var(--color-text-500)] border border-[rgba(159,176,204,0.12)]">
                        {item.stageNum}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--color-text-500)] block truncate mt-0.5">
                    {item.noun}
                  </span>
                </div>
              )}
            </div>

            {/* Active visual edge indicator */}
            {isActive && !isCompact && (
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: item.accentColor }}
              />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>

      {/* Mobile Drawer (Modal overlay on small screens) */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileDrawerOpen(false);
          }}
        >
          <div className="bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.2)] rounded-2xl p-4 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(159,176,204,0.12)]">
              <div className="flex items-center gap-2">
                <Image src="/brand/mark.png" alt="Parikshit" width={24} height={24} className="w-6 h-6 object-contain" />
                <span className="font-display font-bold text-sm text-[var(--color-text-100)]">
                  PARIKSHIT
                </span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation"
                className="p-1 rounded text-[var(--color-text-500)] hover:text-[var(--color-text-100)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavButtons(false)}
          </div>
        </div>
      )}

      {/* Desktop Left Rail Navigation (Persistent) */}
      <nav
        aria-label="Main Navigation"
        className={`hidden md:flex flex-col justify-between shrink-0 transition-all duration-200 border-r border-[rgba(159,176,204,0.12)] bg-[var(--color-ink-900)]/70 backdrop-blur-sm p-3 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Rail Header with Stage Verbs Label */}
          <div className="flex items-center justify-between px-2 pt-1">
            {!collapsed ? (
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-500)] font-semibold">
                Lifecycle Stages
              </span>
            ) : (
              <span className="sr-only">Stages</span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand navigation rail" : "Collapse navigation rail"}
              className="p-1 rounded-md text-[var(--color-text-500)] hover:text-[var(--color-text-100)] hover:bg-[var(--color-ink-800)] transition-colors ml-auto"
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation Items */}
          {renderNavButtons(collapsed)}
        </div>

        {/* Rail Footer: Active Project Snapshot */}
        {!collapsed && (
          <div className="pt-3 border-t border-[rgba(159,176,204,0.12)] flex flex-col gap-2">
            <div className="p-3 rounded-xl bg-[var(--color-ink-800)]/50 border border-[rgba(159,176,204,0.14)] text-xs">
              <div className="flex items-center gap-1.5 text-[var(--color-cyan-300)] font-medium mb-1">
                <FileCode className="w-3.5 h-3.5" />
                <span className="truncate">{projectName}</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-500)] font-mono truncate">
                {revisionId ? `rev_${revisionId.slice(-8)}` : "Ready to verify"}
              </p>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Navigation (Always accessible at 360px viewport) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-ink-950)]/95 border-t border-[rgba(159,176,204,0.16)] backdrop-blur-md flex items-center justify-around py-1.5 px-2"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center p-1 rounded-lg transition-colors min-w-[48px] ${
                isActive
                  ? "text-[var(--color-cyan-300)]"
                  : "text-[var(--color-text-500)] hover:text-[var(--color-text-300)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-medium mt-0.5">{item.verb}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
