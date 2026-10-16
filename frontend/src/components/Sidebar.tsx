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
  projectName = "Demo Calculator Service",
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
    title: string,
    group: "workspace" | "core" | "audit",
    isCompact: boolean
  ) => {
    const items = NAV_ITEMS.filter((i) => i.group === group);
    return (
      <div className="flex flex-col gap-1 w-full">
        {!isCompact && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold px-2 py-1 select-none">
            {title}
          </span>
        )}
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
              title={`${item.verb} – ${item.noun}: ${item.desc}`}
              aria-label={`${item.verb}: ${item.noun}`}
              className={`group relative flex items-center ${
                isCompact
                  ? "justify-center p-2.5"
                  : "justify-between px-3 py-2"
              } rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`p-1 rounded-md shrink-0 transition-colors ${
                    isActive
                      ? "text-[#5E6AD2] bg-[var(--surface-3)]"
                      : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {!isCompact && (
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`leading-tight truncate ${isActive ? "font-semibold text-[var(--text-primary)]" : "font-normal"}`}>
                        {item.noun}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] block truncate">
                      {item.verb}
                    </span>
                  </div>
                )}
              </div>

              {isActive && !isCompact && (
                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#5E6AD2] shadow-[0_0_6px_rgba(94,106,210,0.5)]" />
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
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-[var(--surface-2)] p-1 flex items-center justify-center border border-[var(--border-subtle)]">
                  <Image
                    src="/brand/mark.png"
                    alt="Parikshit"
                    width={24}
                    height={24}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="font-sans font-bold text-xs tracking-wider text-[var(--text-primary)]">
                    PARIKSHIT
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block">
                    AI Engineering Workspace
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderNavGroup("Workspace", "workspace", false)}
            {renderNavGroup("Development Loop", "core", false)}
            {renderNavGroup("Verification & Audit", "audit", false)}
          </div>
        </div>
      )}

      {/* Desktop Left Rail Navigation */}
      <nav
        aria-label="Main Navigation"
        className={`hidden md:flex flex-col justify-between shrink-0 transition-all duration-200 border-r border-[var(--border-subtle)] bg-[var(--surface-1)] p-3 z-30 select-none ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Logo Brand Header & Toggle */}
          <div className="flex items-center justify-between px-1.5 py-1">
            {!collapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-[var(--surface-2)] p-1 flex items-center justify-center border border-[var(--border-subtle)] shrink-0">
                  <Image
                    src="/brand/mark.png"
                    alt="Parikshit Logo"
                    width={22}
                    height={22}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans font-bold text-xs tracking-wider text-[var(--text-primary)]">
                      PARIKSHIT
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[var(--surface-2)] text-[#5E6AD2] border border-[var(--border-subtle)]">
                      v2.0
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] truncate block">
                    Precision Evidence
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-[var(--surface-2)] p-1 flex items-center justify-center border border-[var(--border-subtle)] mx-auto">
                <Image
                  src="/brand/mark.png"
                  alt="Parikshit Logo"
                  width={20}
                  height={20}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand navigation rail" : "Collapse navigation rail"}
              className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Repository Selector Dropdown Card */}
          {!collapsed && (
            <div
              onClick={onSwitchRepo}
              role="button"
              tabIndex={0}
              className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs cursor-pointer hover:border-[var(--border-hover)] transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                  Repository
                </span>
                <ChevronDown className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
              </div>
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium text-xs mt-1 truncate">
                <FileCode className="w-3.5 h-3.5 text-[#5E6AD2] shrink-0" />
                <span className="truncate">{projectName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-mono mt-1">
                <GitBranch className="w-3 h-3 text-[var(--text-muted)]" />
                <span>main</span>
                {revisionId && (
                  <span className="text-[var(--text-muted)]">
                    • rev_{revisionId.slice(-6)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Navigation Items Grouped */}
          <div className="flex flex-col gap-3.5 overflow-y-auto pr-0.5 max-h-[calc(100vh-280px)]">
            {renderNavGroup("Workspace", "workspace", collapsed)}
            {renderNavGroup("Development Loop", "core", collapsed)}
            {renderNavGroup("Audit & Twin", "audit", collapsed)}
          </div>
        </div>

        {/* Rail Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-2">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-md hover:bg-[var(--surface-2)] transition-colors w-full"
              >
                <Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Workspace Settings</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenSettings}
              title="Settings"
              aria-label="Settings"
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--surface-2)] transition-colors mx-auto"
            >
              <Settings className="w-4 h-4" />
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
