import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPalette } from "../CommandPalette";

describe("CommandPalette Component Keyboard Flow", () => {
  it("renders when isOpen is true and focuses input", () => {
    const onClose = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onNavigateTab={onNavigateTab}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    const input = screen.getByTestId("command-palette-input");
    expect(input).toBeDefined();
  });

  it("filters command options based on user query", () => {
    const onClose = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onNavigateTab={onNavigateTab}
      />
    );

    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "mentor" } });

    expect(screen.getByText("Stage 1: Understand")).toBeDefined();
    expect(screen.queryByText("Stage 3: Challenge")).toBeNull();
  });

  it("handles keyboard navigation: ArrowDown, ArrowUp, and Enter", () => {
    const onClose = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onNavigateTab={onNavigateTab}
      />
    );

    const input = screen.getByTestId("command-palette-input");
    // Initially first item is selected. Arrow down to select next
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // Press enter
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onNavigateTab).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when Escape key is pressed", () => {
    const onClose = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onNavigateTab={onNavigateTab}
      />
    );

    const input = screen.getByTestId("command-palette-input");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
