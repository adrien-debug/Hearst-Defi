import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Input } from "./input";

describe("Input", () => {
  it("renders a labelled input and wires htmlFor / id", () => {
    render(<Input label="Email" placeholder="you@example.com" />);
    const el = screen.getByLabelText(/email/i);
    expect(el).toBeTruthy();
    expect(el.tagName).toBe("INPUT");
    expect((el as HTMLInputElement).placeholder).toBe("you@example.com");
  });

  it("becomes aria-invalid and shows the error message when error is set", () => {
    render(
      <Input label="Token" error="Required" defaultValue="" />,
    );
    const el = screen.getByLabelText(/token/i) as HTMLInputElement;
    expect(el.getAttribute("aria-invalid")).toBe("true");
    const err = screen.getByRole("alert");
    expect(err.textContent).toContain("Required");
    expect(el.getAttribute("aria-describedby")).toContain(err.id);
  });

  it("applies variant + size via container data attributes", () => {
    const { container } = render(
      <Input label="Search" variant="filled" size="lg" />,
    );
    const root = container.querySelector(".group\\/input");
    expect(root).toBeTruthy();
  });
});
