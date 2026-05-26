import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Radio, RadioGroup } from "./radio";

describe("RadioGroup", () => {
  it("renders all options with accessible labels", () => {
    render(
      <RadioGroup label="Tier" defaultValue="pro">
        <Radio value="free" label="Free" />
        <Radio value="pro" label="Pro" />
        <Radio value="ent" label="Enterprise" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radio", { name: /free/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /pro/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /enterprise/i })).toBeTruthy();
  });

  it("reflects the defaultValue as data-state=checked", () => {
    render(
      <RadioGroup label="Tier" defaultValue="pro">
        <Radio value="free" label="Free" />
        <Radio value="pro" label="Pro" />
      </RadioGroup>,
    );
    const pro = screen.getByRole("radio", { name: /pro/i });
    expect(pro.getAttribute("data-state")).toBe("checked");
  });

  it("renders an error message with role=alert", () => {
    render(
      <RadioGroup label="Tier" error="Pick one">
        <Radio value="a" label="A" />
        <Radio value="b" label="B" />
      </RadioGroup>,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/pick one/i);
  });
});
