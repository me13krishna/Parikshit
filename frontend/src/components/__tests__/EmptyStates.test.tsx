import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BattleReport } from "../BattleReport";
import { DiffViewer } from "../DiffViewer";
import { TaskPlanner } from "../TaskPlanner";
import { LedgerTimeline } from "../LedgerTimeline";

describe("Empty States & Invitations to Act", () => {
  it("renders empty state invitation in BattleReport when no battle has run", () => {
    const onError = vi.fn();
    render(<BattleReport taskId="tsk_123" onError={onError} />);

    expect(screen.getByText("No battles executed yet.")).toBeDefined();
    expect(
      screen.getByText(/Run a battle to challenge this patch with adversarial stress tests/)
    ).toBeDefined();
    expect(screen.getByText("Start Battle Challenge Now")).toBeDefined();
  });

  it("renders empty state in DiffViewer when diff is empty", () => {
    render(<DiffViewer diff="" />);

    expect(
      screen.getByText("No code changes generated yet. Specify a task and build in sandbox.")
    ).toBeDefined();
  });

  it("renders empty state in TaskPlanner before task creation", () => {
    const onError = vi.fn();
    render(<TaskPlanner projectId="prj_123" onError={onError} />);

    expect(screen.getByText("No active change task created yet.")).toBeDefined();
  });

  it("renders empty state in LedgerTimeline when no entries exist", async () => {
    const onError = vi.fn();
    render(<LedgerTimeline projectId="prj_nonexistent" onError={onError} />);

    // Renders the ledger audit panel
    expect(screen.getByTestId("ledger-verification-panel")).toBeDefined();
  });
});
