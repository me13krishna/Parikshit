"use client";

import React from "react";
import {
  FolderGit2,
  MessageSquareCode,
  Hammer,
  Swords,
  Network,
  History
} from "lucide-react";

export type NavTab = "ingest" | "mentor" | "tasks" | "battle" | "twin" | "ledger";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }> = [
  { id: "ingest", label: "Repository Ingest", icon: FolderGit2 },
  { id: "mentor", label: "Grounded Mentor", icon: MessageSquareCode, badge: "P1" },
  { id: "tasks", label: "Vibe Builder & Gate", icon: Hammer, badge: "P2" },
  { id: "battle", label: "AI vs AI Battle", icon: Swords, badge: "P3" },
  { id: "twin", label: "Digital Twin", icon: Network },
  { id: "ledger", label: "Proof-of-Work Ledger", icon: History, badge: "P4" }
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav aria-label="Main Navigation" className="w-64 border-r border-zinc-800 bg-zinc-950/60 p-4 flex flex-col justify-between shrink-0">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 px-3 mb-2 font-semibold">
          Execution Cockpit
        </span>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-950/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-zinc-500"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-4 border-t border-zinc-900 flex flex-col gap-2">
        <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 text-[11px] text-zinc-400">
          <p className="font-semibold text-zinc-300 mb-1">Five Pillars Active</p>
          <ul className="space-y-0.5 text-zinc-500 font-mono text-[10px]">
            <li>• Grounded Citations</li>
            <li>• Isolated Execution Gate</li>
            <li>• AI-vs-AI Battle Arena</li>
            <li>• Hash-Chained Ledger</li>
            <li>• Self-Healing Loop</li>
          </ul>
        </div>
      </div>
    </nav>
  );
};
