import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "../Header";

describe("Header Component & Ledger Badge", () => {
  const dummyHealth = {
    status: "ok",
    database: "ok",
    sandbox: "docker",
    sandbox_mode: "docker" as const,
    llm_provider: "mock",
    llm_mode: "mock" as const,
    llm_ready: true,
    environment: "development",
    version: "2.0.0",
  };

  it("renders 'Chain Verified' badge with green styling when ledger is intact", () => {
    const validLedger = {
      valid: true,
      count: 10,
    };

    render(
      <Header
        health={dummyHealth}
        projectName="Demo Calculator"
        revisionId="rev_12345678"
        ledgerStatus={validLedger}
      />
    );

    const badge = screen.getByTestId("ledger-badge");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("Chain Verified");
    expect(badge.className).toContain("bg-emerald-950/40");
  });

  it("renders 'Chain Broken' warning with red styling when tampering is detected", () => {
    const brokenLedger = {
      valid: false,
      broken_at_sequence: 3,
      error: "Hash mismatch at sequence 3",
    };

    render(
      <Header
        health={dummyHealth}
        projectName="Demo Calculator"
        revisionId="rev_12345678"
        ledgerStatus={brokenLedger}
      />
    );

    const badge = screen.getByTestId("ledger-badge");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("Chain Broken");
    expect(badge.className).toContain("bg-red-950/60");
    expect(badge.getAttribute("title")).toContain("Ledger Broken at Sequence #3");
  });
});
