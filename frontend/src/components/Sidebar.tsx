"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  MessageSquareCode,
  Hammer,
  Swords,
  History,
  GitFork,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  FileCode,
  GitBranch,
  Settings,
  ChevronDown,
  Terminal,
} from "lucide-react";

export type NavTab =
  | "overview"
  | "ingest"
  | "mentor"
  | "agent"
  | "tasks"
  | "qa"
  | "battle"
  | "heal"
  | "twin"
  | "ledger";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  projectName?: string;
  revisionId?: string;
  onOpenSettings?: () => void;
  onSwitchRepo?: () => void;
}

export interface NavItemConfig {
  id: NavTab;
  alias?: NavTab[];
  stageNum?: number;
  verb: string;
  noun: string;
  desc: string;
  group: "workspace" | "core" | "audit";
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: "overview",
    alias: ["ingest"],
    verb: "Overview",
    noun: "Engineering Cockpit",
    desc: "Command center, repo status & global actions",
    group: "workspace",
    icon: LayoutDashboard,
  },
  {
    id: "mentor",
    stageNum: 1,
    verb: "Understand",
    noun: "Codebase Mentor",
    desc: "AST-grounded explanation with line citations",
    group: "core",
    icon: MessageSquareCode,
  },
  {
    id: "agent",
    alias: ["tasks"],
    stageNum: 2,
    verb: "Build",
    noun: "AI Coding Agent",
    desc: "Task planning, diff generation & human gate",
    group: "core",
    icon: Hammer,
  },
  {
    id: "qa",
    stageNum: 3,
    verb: "Verify",
    noun: "Autonomous QA",
    desc: "Evidence-driven test runs & sandbox logs",
    group: "core",
    icon: Terminal,
  },
  {
    id: "battle",
    stageNum: 4,
    verb: "Challenge",
    noun: "AI Code Battle",
    desc: "Builder vs Adversary edge-case stress arena",
    group: "core",
    icon: Swords,
  },
  {
    id: "heal",
    stageNum: 5,
    verb: "Repair",
    noun: "Self-Healing Loop",
    desc: "Autonomous diagnosis, patching & re-testing",
    group: "core",
    icon: Sparkles,
  },
  {
    id: "twin",
    stageNum: 6,
    verb: "Digital Twin",
    noun: "Software Twin",
    desc: "Dependency graph & blast-radius simulation",
    group: "audit",
    icon: GitFork,
  },
  {
    id: "ledger",
    stageNum: 7,
    verb: "Prove",
    noun: "Proof-of-Work Ledger",
    desc: "Cryptographic SHA-256 tamper-evident trail",
    group: "audit",
    icon: History,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  projectName = "No Active Project",
  revisionId,
  onOpenSettings,
  onSwitchRepo,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Normalize tab
  const isCurrentActive = (item: NavItemConfig) => {
    if (activeTab === item.id) return true;
    if (item.alias && item.alias.includes(activeTab)) return true;
    return false;
  };

  const renderNavGroup = (
    group: "workspace" | "core" | "audit",
    isCompact: boolean
  ) => {
    const items = NAV_ITEMS.filter((i) => i.group === group);
    return (
      <div className="flex flex-col gap-0.5 w-full">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isCurrentActive(item);

          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setMobileDrawerOpen(false);
              }}
              title={`${item.noun}: ${item.desc}`}
              aria-label={item.noun}
              className={`group relative flex items-center ${
                isCompact
                  ? "justify-center p-2"
                  : "justify-between px-2.5 py-1.5"
              } rounded-md text-xs transition-all ${
                isActive
                  ? "bg-[var(--surface-2)] text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]/50 font-normal"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? "text-[#5E6AD2]"
                      : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                  }`}
                />

                {!isCompact && (
                  <span className="truncate tracking-tight leading-tight">
                    {item.noun}
                  </span>
                )}
              </div>

              {isActive && !isCompact && (
                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#5E6AD2]" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileDrawerOpen(false);
          }}
        >
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col gap-3 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md overflow-hidden bg-[var(--surface-2)] p-0.5 flex items-center justify-center border border-[var(--border-subtle)]">
                  <Image
                    src="/brand/mark.png"
                    alt="Parikshit"
                    width={20}
                    height={20}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-sans font-bold text-xs tracking-wider text-[var(--text-primary)]">
                  PARIKSHIT
                </span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation"
                className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderNavGroup("workspace", false)}
            <div className="h-px bg-[var(--border-subtle)] my-1" />
            {renderNavGroup("core", false)}
            <div className="h-px bg-[var(--border-subtle)] my-1" />
            {renderNavGroup("audit", false)}
          </div>
        </div>
      )}

      {/* Desktop Left Rail Navigation */}
      <nav
        aria-label="Main Navigation"
        className={`hidden md:flex flex-col justify-between shrink-0 transition-all duration-200 border-r border-[var(--border-subtle)] bg-[var(--surface-1)] p-2 z-30 select-none ${
          collapsed ? "w-14" : "w-52"
        }`}
      >
        <div className="flex flex-col gap-2">
          {/* Top: Logo & Collapse Button */}
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-1 py-1`}>
            {!collapsed ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md overflow-hidden bg-[var(--surface-2)] p-0.5 flex items-center justify-center border border-[var(--border-subtle)] shrink-0">
                  <Image
                    src="/brand/mark.png"
                    alt="Parikshit Logo"
                    width={18}
                    height={18}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-sans font-semibold text-xs tracking-wider text-[var(--text-primary)]">
                  WORKSPACE
                </span>
              </div>
            ) : null}

            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand navigation rail" : "Collapse navigation rail"}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Quick Repository Pill */}
          {!collapsed && (
            <button
              onClick={onSwitchRepo}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group mb-1 text-left"
              title="Click to switch workspace repository"
            >
              <div className="flex items-center gap-1.5 truncate">
                <GitBranch className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[#5E6AD2] shrink-0" />
                <span className="truncate font-medium">{projectName}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            </button>
          )}

          {/* Navigation Items */}
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {renderNavGroup("workspace", collapsed)}
            <div className="h-px bg-[var(--border-subtle)] my-1" />
            {renderNavGroup("core", collapsed)}
            <div className="h-px bg-[var(--border-subtle)] my-1" />
            {renderNavGroup("audit", collapsed)}
          </div>
        </div>

        {/* Rail Footer */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-1">
          {!collapsed ? (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-md hover:bg-[var(--surface-2)] transition-colors w-full"
            >
              <Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Settings</span>
            </button>
          ) : (
            <button
              onClick={onOpenSettings}
              title="Settings"
              aria-label="Settings"
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--surface-2)] transition-colors mx-auto"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface-1)]/95 border-t border-[var(--border-subtle)] backdrop-blur-md flex items-center justify-around py-1.5 px-2"
      >
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = isCurrentActive(item);
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center p-1 rounded-lg transition-colors min-w-[50px] ${
                isActive
                  ? "text-[#5E6AD2]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-medium mt-0.5">{item.noun.split(" ")[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-w-[50px]"
        >
          <div className="w-4 h-4 flex flex-col justify-center items-center gap-0.5">
            <span className="w-3 h-0.5 bg-[var(--text-secondary)] rounded" />
            <span className="w-3 h-0.5 bg-[var(--text-secondary)] rounded" />
            <span className="w-3 h-0.5 bg-[var(--text-secondary)] rounded" />
          </div>
          <span className="text-[9px] font-medium mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
};
