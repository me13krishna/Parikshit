"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  MessageSquareCode,
  Hammer,
  Swords,
  ShieldCheck,
  History,
  LayoutDashboard,
  Play,
  Download,
  FolderCode,
  X,
  CornerDownLeft,
} from "lucide-react";
import { NavTab } from "./Sidebar";

export interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Actions";
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onLoadDemo?: () => void;
  onVerifyLedger?: () => void;
  onRunChecks?: () => void;
  onExportEvidencePack?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onLoadDemo,
  onVerifyLedger,
  onRunChecks,
  onExportEvidencePack,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    {
      id: "nav-overview",
      title: "Overview",
      subtitle: "Project dashboard, onboarding, and 5-stage lifecycle orbit",
      category: "Navigation",
      icon: LayoutDashboard,
      action: () => onNavigateTab("ingest"),
      shortcut: "G O",
    },
    {
      id: "nav-mentor",
      title: "Stage 1: Understand",
      subtitle: "Grounded codebase mentor and AST line citations",
      category: "Navigation",
      icon: MessageSquareCode,
      action: () => onNavigateTab("mentor"),
      shortcut: "G U",
    },
    {
      id: "nav-tasks",
      title: "Stage 2: Change",
      subtitle: "Vibe builder, unified diff viewer, and human approval gate",
      category: "Navigation",
      icon: Hammer,
      action: () => onNavigateTab("tasks"),
      shortcut: "G C",
    },
    {
      id: "nav-battle",
      title: "Stage 3: Challenge",
      subtitle: "AI-vs-AI multi-agent battle arena and stress tests",
      category: "Navigation",
      icon: Swords,
      action: () => onNavigateTab("battle"),
      shortcut: "G A",
    },
    {
      id: "nav-twin",
      title: "Stage 4: Verify",
      subtitle: "Sandbox checks, self-heal loop, and blast-radius simulation",
      category: "Navigation",
      icon: ShieldCheck,
      action: () => onNavigateTab("twin"),
      shortcut: "G V",
    },
    {
      id: "nav-ledger",
      title: "Stage 5: Prove",
      subtitle: "Proof-of-work hash chain and cryptographic audit trail",
      category: "Navigation",
      icon: History,
      action: () => onNavigateTab("ledger"),
      shortcut: "G P",
    },
    ...(onLoadDemo
      ? [
          {
            id: "act-demo",
            title: "Load Demo Project",
            subtitle: "Ingest calculator service with full AST index and tests",
            category: "Actions" as const,
            icon: FolderCode,
            action: onLoadDemo,
          },
        ]
      : []),
    ...(onVerifyLedger
      ? [
          {
            id: "act-verify-ledger",
            title: "Verify Ledger Integrity",
            subtitle: "Audit all SHA-256 blocks for forward/backward hash validity",
            category: "Actions" as const,
            icon: ShieldCheck,
            action: onVerifyLedger,
          },
        ]
      : []),
    ...(onRunChecks
      ? [
          {
            id: "act-run-checks",
            title: "Run Sandbox Checks",
            subtitle: "Execute test suite in isolated runner",
            category: "Actions" as const,
            icon: Play,
            action: onRunChecks,
          },
        ]
      : []),
    ...(onExportEvidencePack
      ? [
          {
            id: "act-export",
            title: "Download Evidence Pack",
            subtitle: "Export signed JSON manifest of all ledger blocks",
            category: "Actions" as const,
            icon: Download,
            action: onExportEvidencePack,
          },
        ]
      : []),
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl bg-[var(--color-ink-900)] border border-[rgba(159,176,204,0.22)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] border-active-top animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(159,176,204,0.12)] bg-[var(--color-ink-950)]/50">
          <Search className="w-4 h-4 text-[var(--color-cyan-300)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            data-testid="command-palette-input"
            value={query}
            onChange={handleQueryChange}
            placeholder="Type a command or jump to stage (e.g. mentor, diff, verify)..."
            className="flex-1 bg-transparent text-xs text-[var(--color-text-100)] placeholder-[var(--color-text-500)] focus:outline-none"
          />
          <span className="text-[10px] font-mono text-[var(--color-text-500)] px-1.5 py-0.5 rounded border border-[rgba(159,176,204,0.15)] bg-[var(--color-ink-900)]">
            ESC
          </span>
          <button
            onClick={onClose}
            aria-label="Close command palette"
            className="text-[var(--color-text-500)] hover:text-[var(--color-text-100)] p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-500)] font-sans">
              No matching commands or destinations found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  data-selected={isSelected ? "true" : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-[rgba(106,215,250,0.12)] text-[var(--color-text-100)] border border-[rgba(106,215,250,0.3)]"
                      : "text-[var(--color-text-300)] hover:bg-[var(--color-ink-800)]/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-[var(--color-cyan-300)] text-[var(--color-ink-950)]"
                          : "bg-[var(--color-ink-800)] text-[var(--color-text-300)]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--color-text-100)] truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-500)] truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] font-mono uppercase text-[var(--color-text-500)] px-1.5 py-0.5 rounded bg-[var(--color-ink-950)] border border-[rgba(159,176,204,0.1)]">
                      {item.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[var(--color-cyan-300)]" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[var(--color-ink-950)] border-t border-[rgba(159,176,204,0.12)] flex items-center justify-between text-[11px] text-[var(--color-text-500)] font-sans">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[var(--color-ink-800)] border border-[rgba(159,176,204,0.15)] font-mono text-[10px]">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[var(--color-ink-800)] border border-[rgba(159,176,204,0.15)] font-mono text-[10px]">
                ↵
              </kbd>{" "}
              Execute
            </span>
          </div>
          <span>Parikshit Cockpit</span>
        </div>
      </div>
    </div>
  );
};
