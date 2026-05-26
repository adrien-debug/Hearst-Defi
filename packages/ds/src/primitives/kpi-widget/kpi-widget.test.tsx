import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { KpiWidget } from "./kpi-widget";

describe("KpiWidget", () => {
  afterEach(() => cleanup());

  it("renders label and value", () => {
    render(<KpiWidget label="TVL" value="12.4M" unit="USDC" />);
    expect(screen.getByText("TVL")).toBeTruthy();
    expect(screen.getByText("12.4M")).toBeTruthy();
    expect(screen.getByText("USDC")).toBeTruthy();
  });

  it("renders a delta with correct direction data attr", () => {
    render(
      <KpiWidget
        label="APY"
        value="11.2"
        delta={{ value: 1.4, direction: "up" }}
      />,
    );
    const delta = screen.getByLabelText("Delta up");
    expect(delta.getAttribute("data-dir")).toBe("up");
  });

  it("renders a sparkline SVG when sparkline data is provided", () => {
    const { container } = render(
      <KpiWidget label="Mining" value="0.92" sparkline={[1, 2, 3, 2, 4, 5]} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.querySelector("path")).toBeTruthy();
  });

  it("renders a provenance pill with data-prov attr", () => {
    render(<KpiWidget label="Yield" value="9.4-12.8 %" provenance="live" />);
    const pill = screen.getByLabelText("Provenance live");
    expect(pill.getAttribute("data-prov")).toBe("live");
  });
});
