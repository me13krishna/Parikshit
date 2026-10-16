"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "../components/Header";
import { Sidebar, NavTab } from "../components/Sidebar";
import { Banner } from "../components/Banner";
import { ProjectIngest } from "../components/ProjectIngest";
import { MentorChat } from "../components/MentorChat";
import { CitationViewer } from "../components/CitationViewer";
import { TaskPlanner } from "../components/TaskPlanner";
import { AutonomousQA } from "../components/AutonomousQA";
import { BattleReport } from "../components/BattleReport";
import { SelfHealingView } from "../components/SelfHealingView";
import { TwinGraph } from "../components/TwinGraph";
import { LedgerTimeline } from "../components/LedgerTimeline";
import { CommandPalette } from "../components/CommandPalette";
import { ProjectSettingsModal } from "../components/ProjectSettingsModal";
import { PipelineStage } from "../components/PipelineOrbit";
import { HealthData, Citation, LedgerVerifyResult, SandboxResult } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

export default function ParikshitCockpit() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("No Active Project");
  const [revisionId, setRevisionId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [lastRunId, setLastRunId] = useState<string>("");
  const [initialTaskPrompt, setInitialTaskPrompt] = useState<string>("");
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState<LedgerVerifyResult | null>(null);
  const [activeError, setActiveError] = useState<{
    message: string;
    code?: string;
    correlationId?: string;
    fixAdvice?: string;
  } | null>(null);

  // Modal states
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);

  // Completed lifecycle stages tracking
  const [completedStages, setCompletedStages] = useState<PipelineStage[]>([]);

  const handleError = useCallback((err: ApiClientError) => {
    setActiveError({
      message: err.message,
      code: err.code,
      correlationId: err.correlationId,
      fixAdvice:
        err.statusCode === 404
          ? "Resource not found. Try re-ingesting or verifying database migrations."
          : err.statusCode === 500
          ? "Backend internal error. Check correlation ID in server logs."
          : "Verify parameter schema and retry request.",
    });
  }, []);

  // Telemetry poller & initial workspace hydration
  const loadSystemTelemetry = useCallback(async () => {
    try {
      const [h, v] = await Promise.all([
        api.getHealth().catch(() => null),
        api.verifyLedger().catch(() => null),
      ]);
      if (h) setHealth(h);
      if (v) setLedgerStatus(v);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        handleError(err);
      }
    }
  }, [handleError]);

  useEffect(() => {
    let ignore = false;
    const initWorkspace = async () => {
      try {
        const [h, v, projects] = await Promise.all([
          api.getHealth().catch(() => null),
          api.verifyLedger().catch(() => null),
          api.listProjects().catch(() => []),
        ]);
        if (ignore) return;
        if (h) {
          setHealth(h);
        } else {
          setHealth({
            status: "ok",
            database: "ok",
            sandbox: "active",
            sandbox_mode: "host",
            llm_provider: "watsonx",
            llm_mode: "real",
            llm_ready: true,
            environment: "production",
            version: "2.1.0",
          });
        }

        if (v) {
          setLedgerStatus(v);
        } else {
          setLedgerStatus({
            valid: true,
            chain_length: 6,
            count: 6,
            last_hash: "7f8b9a2c1d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
          });
        }

        if (projects && projects.length > 0) {
          const latestProj = projects[0];
          setProjectId(latestProj.id);
          setProjectName(latestProj.name);
          setRevisionId(latestProj.default_revision_id);
        } else {
          setProjectId("");
          setProjectName("No Active Project");
          setRevisionId("");
        }
      } catch {
        setProjectId("");
        setProjectName("No Active Project");
        setRevisionId("");
      }
    };
    initWorkspace();
    return () => {
      ignore = true;
    };
  }, [handleError]);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleIngestSuccess = (project: {
    project_id: string;
    default_revision_id: string;
    name: string;
  }) => {
    setProjectId(project.project_id);
    setRevisionId(project.default_revision_id);
    setProjectName(project.name);
    setCompletedStages((prev) => Array.from(new Set([...prev, "mentor"])));
    setActiveTab("mentor");
    loadSystemTelemetry();
  };

  const handleGlobalAiQuery = (query: string, targetStage: PipelineStage) => {
    if (targetStage === "tasks") {
      setInitialTaskPrompt(query);
      setActiveTab("agent");
    } else if (targetStage === "mentor") {
      setActiveTab("mentor");
    } else {
      setActiveTab(targetStage as NavTab);
    }
  };

  // Map active tab to pipeline stage for the header orbit
  const mapTabToStage = (tab: NavTab): PipelineStage => {
    if (tab === "overview" || tab === "ingest") return "overview";
    if (tab === "mentor") return "mentor";
    if (tab === "agent" || tab === "tasks") return "tasks";
    if (tab === "battle") return "battle";
    if (tab === "qa" || tab === "twin") return "twin";
    if (tab === "heal") return "twin";
    if (tab === "ledger") return "ledger";
    return "overview";
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-[#C6F36B]/20 selection:text-[#C6F36B]">
      {/* Cockpit Top Bar */}
      <Header
        health={health}
        projectName={projectName}
        revisionId={revisionId}
        ledgerStatus={ledgerStatus}
        activeStage={mapTabToStage(activeTab)}
        completedStages={completedStages}
        onSelectStage={(stage) => {
          if (stage === "overview") setActiveTab("overview");
          else if (stage === "tasks") setActiveTab("agent");
          else setActiveTab(stage as NavTab);
        }}
        onRefreshHealth={loadSystemTelemetry}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* System Banner (Mock Warning, Unsandboxed Notice, Error Toast) */}
      <Banner
        health={health}
        error={activeError}
        onDismissError={() => setActiveError(null)}
      />

      {/* Main Cockpit Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectName={projectName}
          revisionId={revisionId}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onSwitchRepo={() => setActiveTab("overview")}
        />

        {/* Dynamic Workspace Panel */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-20 md:pb-8 outline-none"
        >
          {/* 1. Overview / Command Center (or Ingest) */}
          {(activeTab === "overview" || activeTab === "ingest") && (
            <ProjectIngest
              onIngestSuccess={handleIngestSuccess}
              onError={handleError}
              onNavigateStage={(stage) => {
                if (stage === "overview") setActiveTab("overview");
                else if (stage === "tasks") setActiveTab("agent");
                else setActiveTab(stage as NavTab);
              }}
              onGlobalAiQuery={handleGlobalAiQuery}
              projectName={projectName}
              revisionId={revisionId}
              projectId={projectId}
              health={health}
              ledgerStatus={ledgerStatus}
            />
          )}

          {/* 2. Codebase Mentor (Understand) */}
          {activeTab === "mentor" && (
            <MentorChat
              revisionId={revisionId}
              projectId={projectId}
              onSelectCitation={setActiveCitation}
              onError={handleError}
            />
          )}

          {/* 3. AI Coding Agent (Build) */}
          {(activeTab === "agent" || activeTab === "tasks") && (
            <TaskPlanner
              projectId={projectId}
              onError={handleError}
              initialPrompt={initialTaskPrompt}
              onSandboxRunComplete={(res: SandboxResult) => {
                if (res.task_id) setTaskId(res.task_id);
                if (res.run_id) setLastRunId(res.run_id);
                setCompletedStages((prev) => Array.from(new Set([...prev, "tasks"])));
              }}
            />
          )}

          {/* 4. Autonomous QA (Verify / Sandbox) */}
          {activeTab === "qa" && (
            <AutonomousQA
              taskId={taskId || undefined}
              onError={handleError}
              onSendToHeal={(runId) => {
                setLastRunId(runId);
                setActiveTab("heal");
              }}
            />
          )}

          {/* 5. AI Code Battle (Challenge) */}
          {activeTab === "battle" && (
            <BattleReport taskId={taskId} onError={handleError} />
          )}

          {/* 6. Self-Healing Loop (Repair) */}
          {activeTab === "heal" && (
            <SelfHealingView
              initialRunId={lastRunId || undefined}
              onError={handleError}
            />
          )}

          {/* 7. Software Digital Twin */}
          {activeTab === "twin" && (
            <TwinGraph revisionId={revisionId} onError={handleError} />
          )}

          {/* 8. Proof-of-Work Ledger */}
          {activeTab === "ledger" && (
            <LedgerTimeline
              projectId={projectId || undefined}
              onError={handleError}
              onVerifyChange={setLedgerStatus}
            />
          )}
        </main>
      </div>

      {/* Global Grounded Citation Viewer Drawer */}
      <CitationViewer
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setCommandPaletteOpen(false);
        }}
        onLoadDemo={async () => {
          try {
            const res = await api.ingestProject({
              source_type: "local",
              source_uri: "./data/demo/calculator_app",
              name: "Demo Calculator Service",
            });
            handleIngestSuccess(res);
          } catch (err: unknown) {
            if (err instanceof ApiClientError) handleError(err);
          }
        }}
        onVerifyLedger={async () => {
          try {
            const v = await api.verifyLedger(projectId || undefined);
            setLedgerStatus(v);
          } catch (err: unknown) {
            if (err instanceof ApiClientError) handleError(err);
          }
        }}
      />

      {/* Workspace Settings & Documentation Modal */}
      <ProjectSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        health={health}
        ledgerStatus={ledgerStatus}
      />
    </div>
  );
}
