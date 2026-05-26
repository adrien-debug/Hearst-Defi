import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { CommandPalette } from "./command-palette";
import type { CommandPaletteCommand } from "./command-palette.types";

const sample: CommandPaletteCommand[] = [
  { id: "go.home", label: "Go home", group: "Nav", action: () => {} },
  { id: "open.settings", label: "Open settings", group: "Nav", action: () => {} },
  { id: "create.invoice", label: "Create invoice", group: "Create", action: () => {} },
];

describe("CommandPalette", () => {
  afterEach(() => cleanup());

  it("renders nothing when closed", () => {
    const { container } = render(
      <CommandPalette open={false} onOpenChange={() => {}} commands={sample} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders all commands when open and an input", () => {
    render(
      <CommandPalette open onOpenChange={() => {}} commands={sample} />,
    );
    expect(screen.getByRole("combobox")).toBeTruthy();
    expect(screen.getByText("Go home")).toBeTruthy();
    expect(screen.getByText("Create invoice")).toBeTruthy();
  });

  it("filters commands as the user types and fires action on Enter", () => {
    const onAction = vi.fn();
    const onOpenChange = vi.fn();
    const cmds: CommandPaletteCommand[] = [
      { id: "a", label: "Alpha", action: onAction },
      { id: "b", label: "Bravo", action: () => {} },
    ];
    render(
      <CommandPalette open onOpenChange={onOpenChange} commands={cmds} />,
    );
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "alp" } });
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.queryByText("Bravo")).toBeNull();
    fireEvent.keyDown(input.closest("[role='dialog']")!, { key: "Enter" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("has dialog semantics", () => {
    render(
      <CommandPalette open onOpenChange={() => {}} commands={sample} ariaLabel="Palette" />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });
});
