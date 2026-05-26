import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { Terminal } from "./terminal";

describe("Terminal", () => {
  afterEach(() => cleanup());

  it("renders all lines with their level data attr", () => {
    render(
      <Terminal
        lines={[
          { id: "1", level: "log", content: "boot" },
          { id: "2", level: "error", content: "boom" },
          { id: "3", level: "success", content: "ok" },
        ]}
      />,
    );
    expect(screen.getByText("boot")).toBeTruthy();
    expect(screen.getByText("boom").closest("[data-level='error']")).toBeTruthy();
    expect(screen.getByText("ok").closest("[data-level='success']")).toBeTruthy();
  });

  it("shows an input when interactive and emits onSubmit on Enter", () => {
    const onSubmit = vi.fn();
    render(
      <Terminal
        lines={[]}
        interactive
        onSubmit={onSubmit}
        prompt="> "
      />,
    );
    const input = screen.getByLabelText("Terminal command") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "vault.status" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("vault.status");
    expect(input.value).toBe("");
  });

  it("exposes a log role", () => {
    render(<Terminal lines={[]} />);
    expect(screen.getByRole("log")).toBeTruthy();
  });
});
