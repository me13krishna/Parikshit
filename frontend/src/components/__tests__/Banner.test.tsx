import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Banner } from "../Banner";

describe("Banner Component & Error Toast", () => {
  it("renders error toast showing error code, correlation ID, and advice", () => {
    const error = {
      message: "Database connection failed",
      code: "DB_TIMEOUT",
      correlationId: "corr_91fa48b",
      fixAdvice: "Check database service on port 5432.",
    };

    render(<Banner error={error} />);

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Database connection failed")).toBeDefined();
    expect(screen.getByText("DB_TIMEOUT")).toBeDefined();
    expect(screen.getByText("corr_91fa48b")).toBeDefined();
    expect(screen.getByText("Check database service on port 5432.")).toBeDefined();
  });

  it("calls onDismissError when close button is clicked", () => {
    const onDismiss = vi.fn();
    const error = {
      message: "AST syntax parse error",
      code: "AST_ERROR",
    };

    render(<Banner error={error} onDismissError={onDismiss} />);

    const closeBtn = screen.getByLabelText("Dismiss error");
    fireEvent.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders demo mock mode banner when in mock provider", () => {
    const health = {
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

    render(<Banner health={health} />);

    expect(screen.getByText("DEMO / MOCK MODE")).toBeDefined();
    expect(screen.getByText(/Zero external API costs/)).toBeDefined();
  });
});
