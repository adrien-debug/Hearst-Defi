import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { X } from "lucide-react";

import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("renders an accessible name from required aria-label", () => {
    render(
      <IconButton aria-label="Close dialog">
        <X />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: /close dialog/i })).toBeTruthy();
  });

  it("supports variant + size switching via data attributes", () => {
    render(
      <IconButton aria-label="Sub" variant="solid" size="lg">
        <X />
      </IconButton>,
    );
    const el = screen.getByRole("button", { name: /sub/i });
    expect(el.getAttribute("data-variant")).toBe("solid");
    expect(el.getAttribute("data-size")).toBe("lg");
  });

  it("disables interaction when loading", () => {
    render(
      <IconButton aria-label="Save" loading>
        <X />
      </IconButton>,
    );
    const el = screen.getByRole("button", { name: /save/i });
    expect(el.getAttribute("aria-busy")).toBe("true");
    expect((el as HTMLButtonElement).disabled).toBe(true);
  });
});
