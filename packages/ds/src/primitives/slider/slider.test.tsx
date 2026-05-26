import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Slider } from "./slider";

describe("Slider", () => {
  it("renders a single thumb by default", () => {
    render(<Slider min={0} max={100} ariaLabel="Allocation" defaultValue={40} />);
    const thumbs = screen.getAllByRole("slider");
    expect(thumbs.length).toBe(1);
  });

  it("renders two thumbs in dual-thumb mode", () => {
    render(
      <Slider
        min={0}
        max={100}
        dualThumb
        ariaLabel="Range"
        defaultValue={[20, 80] as const}
      />,
    );
    expect(screen.getAllByRole("slider").length).toBe(2);
  });

  it("renders the marks under the track", () => {
    render(
      <Slider
        min={0}
        max={100}
        defaultValue={50}
        ariaLabel="P"
        marks={[
          { value: 0, label: "0%" },
          { value: 50, label: "50%" },
          { value: 100, label: "100%" },
        ]}
      />,
    );
    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
  });
});
