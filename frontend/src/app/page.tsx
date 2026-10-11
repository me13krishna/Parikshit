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
  const [activeError, setActiveError] = useState<{ message: string; code?: string; correlationId?: string } | null>(null);

  // Poll system health and ledger verification
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
          correlationId: err.correlationId
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
            correlationId: err.correlationId
          });
        }
      }
    };
    fetchTelemetry();
    return () => {
      ignore = true;
    };
  }, []);

  const handleIngestSuccess = (project: { project_id: string; default_revision_id: string; name: string }) => {
    setProjectId(project.project_id);
    setRevisionId(project.default_revision_id);
    setProjectName(project.name);
    setActiveTab("mentor");
    loadSystemTelemetry();
  };

  const handleError = (err: ApiClientError) => {
    setActiveError({
      message: err.message,
      code: err.code,
      correlationId: err.correlationId
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* System Banner (Mock Warning, Unsandboxed Badge, Error Toast) */}
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
        onRefreshHealth={loadSystemTelemetry}
      />

      {/* Main Cockpit Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Dynamic Workspace Panel */}
        <main className="flex-1 overflow-y-auto bg-zinc-950/40 p-2 sm:p-4 md:p-6">
          {activeTab === "ingest" && (
            <ProjectIngest onIngestSuccess={handleIngestSuccess} onError={handleError} />
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
    </div>
  );
}
