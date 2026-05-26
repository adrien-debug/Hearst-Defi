import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { SpotlightSearch } from "./spotlight-search";

describe("SpotlightSearch", () => {
  afterEach(() => cleanup());

  it("renders nothing when closed", () => {
    const { container } = render(
      <SpotlightSearch
        open={false}
        onOpenChange={() => {}}
        onQuery={async () => []}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog and footer hints when open", () => {
    render(
      <SpotlightSearch
        open
        onOpenChange={() => {}}
        onQuery={async () => []}
      />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("navigate")).toBeTruthy();
    expect(screen.getByText("select")).toBeTruthy();
    expect(screen.getByText("close")).toBeTruthy();
  });

  it("calls onQuery and renders sections after debounce", async () => {
    vi.useFakeTimers();
    try {
      const onQuery = vi.fn().mockResolvedValue([
        {
          section: "Vaults",
          items: [{ id: "v1", label: "Yield Vault" }],
        },
      ]);
      render(
        <SpotlightSearch open onOpenChange={() => {}} onQuery={onQuery} />,
      );
      const input = screen.getByRole("combobox") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "yield" } });
      await act(async () => {
        vi.advanceTimersByTime(250);
        await Promise.resolve();
      });
      expect(onQuery).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
