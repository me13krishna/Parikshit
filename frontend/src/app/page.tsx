"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "../components/Header";
import { Sidebar, NavTab } from "../components/Sidebar";
import { Banner } from "../components/Banner";
import { ProjectIngest } from "../components/ProjectIngest";
import { MentorChat } from "../components/MentorChat";
import { CitationViewer } from "../components/CitationViewer";
import { TaskPlanner } from "../components/TaskPlanner";
import { BattleReport } from "../components/BattleReport";
import { TwinGraph } from "../components/TwinGraph";
import { LedgerTimeline } from "../components/LedgerTimeline";
import { CommandPalette } from "../components/CommandPalette";
import { PipelineStage } from "../components/PipelineOrbit";
import { HealthData, Citation, LedgerVerifyResult } from "../lib/types";
import { api, ApiClientError } from "../lib/api";

export default function ParikshitCockpit() {
  const [activeTab, setActiveTab] = useState<NavTab>("ingest");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("Demo Calculator Service");
  const [revisionId, setRevisionId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState<LedgerVerifyResult | null>(null);
  const [activeError, setActiveError] = useState<{
    message: string;
    code?: string;
    correlationId?: string;
    fixAdvice?: string;
  } | null>(null);

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);

  // Completed lifecycle stages tracking
  const [completedStages, setCompletedStages] = useState<PipelineStage[]>([]);

  // Telemetry poller
  const loadSystemTelemetry = useCallback(async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
      const v = await api.verifyLedger();
      setLedgerStatus(v);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setActiveError({
          message: err.message,
          code: err.code,
          correlationId: err.correlationId,
        });
      }
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const fetchTelemetry = async () => {
      try {
        const h = await api.getHealth();
        if (!ignore) setHealth(h);
        const v = await api.verifyLedger();
        if (!ignore) setLedgerStatus(v);
      } catch (err: unknown) {
        if (!ignore && err instanceof ApiClientError) {
          setActiveError({
            message: err.message,
            code: err.code,
            correlationId: err.correlationId,
          });
        }
      }
    };
    fetchTelemetry();
    return () => {
      ignore = true;
    };
  }, []);

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

  const handleError = (err: ApiClientError) => {
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
  };

  return (
    <div className="min-h-screen bg-[var(--color-ink-950)] text-[var(--color-text-100)] flex flex-col font-sans selection:bg-[var(--color-cyan-300)]/20 selection:text-[var(--color-cyan-300)]">
      {/* System Banner (Mock Warning, Unsandboxed Notice, Error Toast) */}
      <Banner
        health={health}
        error={activeError}
        onDismissError={() => setActiveError(null)}
      />

      {/* Cockpit Top Bar */}
      <Header
        health={health}
        projectName={projectName}
        revisionId={revisionId}
        ledgerStatus={ledgerStatus}
        activeStage={activeTab === "ingest" ? "overview" : (activeTab as PipelineStage)}
        completedStages={completedStages}
        onSelectStage={(stage) => setActiveTab(stage as NavTab)}
        onRefreshHealth={loadSystemTelemetry}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Main Cockpit Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectName={projectName}
          revisionId={revisionId}
        />

        {/* Dynamic Workspace Panel */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 pb-16 md:pb-8 outline-none"
        >
          {activeTab === "ingest" && (
            <ProjectIngest
              onIngestSuccess={handleIngestSuccess}
              onError={handleError}
              onNavigateStage={(stage) => setActiveTab(stage as NavTab)}
            />
          )}

          {activeTab === "mentor" && (
            <MentorChat
              revisionId={revisionId}
              onSelectCitation={setActiveCitation}
              onError={handleError}
            />
          )}

          {activeTab === "tasks" && (
            <TaskPlanner
              projectId={projectId}
              onError={handleError}
              onSandboxRunComplete={(res) => {
                if (res.task_id) setTaskId(res.task_id);
                setCompletedStages((prev) => Array.from(new Set([...prev, "tasks"])));
              }}
            />
          )}

          {activeTab === "battle" && (
            <BattleReport taskId={taskId} onError={handleError} />
          )}

          {activeTab === "twin" && (
            <TwinGraph revisionId={revisionId} onError={handleError} />
          )}

          {activeTab === "ledger" && (
            <LedgerTimeline
              projectId={projectId || undefined}
              onError={handleError}
              onVerifyChange={setLedgerStatus}
            />
          )}
        </main>
      </div>

      {/* Global Grounded Citation Viewer Modal */}
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
    </div>
  );
}
