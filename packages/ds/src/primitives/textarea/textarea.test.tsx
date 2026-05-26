import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders a labelled textarea", () => {
    render(<Textarea label="Notes" placeholder="Type here…" />);
    const el = screen.getByLabelText(/notes/i);
    expect(el.tagName).toBe("TEXTAREA");
  });

  it("exposes aria-invalid + alert when error is present", () => {
    render(<Textarea label="Notes" error="Required" />);
    const el = screen.getByLabelText(/notes/i);
    expect(el.getAttribute("aria-invalid")).toBe("true");
    const err = screen.getByRole("alert");
    expect(err.textContent).toMatch(/required/i);
  });

  it("renders the counter when maxLength is set", () => {
    render(<Textarea label="Memo" maxLength={120} defaultValue="abc" />);
    expect(screen.getByText("3 / 120")).toBeTruthy();
  });
});
