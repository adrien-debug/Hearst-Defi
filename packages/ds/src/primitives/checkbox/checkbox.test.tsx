import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders with an accessible label", () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByRole("checkbox", { name: /accept terms/i })).toBeTruthy();
  });

  it("renders the card variant with a different layout class", () => {
    const { container } = render(
      <Checkbox variant="card" label="Power user" defaultChecked />,
    );
    const root = container.querySelector("label");
    expect(root?.className).toMatch(/rounded-/);
  });

  it("supports indeterminate state via the indeterminate prop", () => {
    render(<Checkbox label="Mixed" indeterminate />);
    const cb = screen.getByRole("checkbox", { name: /mixed/i });
    expect(cb.getAttribute("data-state")).toBe("indeterminate");
  });
});
