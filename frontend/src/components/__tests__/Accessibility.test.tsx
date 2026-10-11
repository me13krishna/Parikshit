import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { Header } from "../Header";
import { PipelineOrbit } from "../PipelineOrbit";

describe("Accessibility (axe-core automated checks)", () => {
  it("PipelineOrbit has zero critical accessibility violations", async () => {
    const { container } = render(
      <main>
        <PipelineOrbit activeStage="overview" variant="hero" />
      </main>
    );

    const results = await axe.run(container, {
      rules: {
        // In jsdom without full CSS engine, color-contrast can give false warnings
        "color-contrast": { enabled: false },
      },
    });

    const criticalViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(criticalViolations).toEqual([]);
  });

  it("Header has zero critical accessibility violations", async () => {
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

    const { container } = render(
      <Header
        health={dummyHealth}
        projectName="Demo Calculator Service"
        revisionId="rev_12345678"
        onRefreshHealth={() => {}}
        onOpenCommandPalette={() => {}}
      />
    );

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    const criticalViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(criticalViolations).toEqual([]);
  });
});
