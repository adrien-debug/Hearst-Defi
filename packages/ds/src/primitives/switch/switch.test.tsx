import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Switch } from "./switch";

describe("Switch", () => {
  it("renders a switch with an accessible label", () => {
    render(<Switch label="Email notifications" />);
    expect(
      screen.getByRole("switch", { name: /email notifications/i }),
    ).toBeTruthy();
  });

  it("reflects defaultChecked state", () => {
    render(<Switch label="Beta features" defaultChecked />);
    const s = screen.getByRole("switch", { name: /beta features/i });
    expect(s.getAttribute("data-state")).toBe("checked");
  });

  it("renders the label on the left when labelPosition='left'", () => {
    const { container } = render(
      <Switch label="Auto-save" labelPosition="left" />,
    );
    const label = container.querySelector("label");
    expect(label?.className).toMatch(/flex-row-reverse/);
  });
});
