import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import {
  AreaChart,
  BarChart,
  DonutChart,
  LineChart,
  SparklineChart,
} from "./chart";

describe("Chart family", () => {
  afterEach(() => cleanup());

  it("renders a LineChart SVG with one path per series", () => {
    const { container } = render(
      <LineChart
        a11yLabel="apy"
        xKey="x"
        yKey="y"
        series={[
          {
            id: "apy",
            data: [
              { x: 0, y: 8 },
              { x: 1, y: 10 },
              { x: 2, y: 11 },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByLabelText("apy")).toBeTruthy();
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("renders a BarChart with one rect per datum", () => {
    const { container } = render(
      <BarChart
        xKey="m"
        yKey="v"
        data={[
          { m: "Jan", v: 1 },
          { m: "Feb", v: 2 },
          { m: "Mar", v: 3 },
        ]}
      />,
    );
    expect(container.querySelectorAll("rect").length).toBeGreaterThanOrEqual(3);
  });

  it("renders a DonutChart slice per datum", () => {
    const { container } = render(
      <DonutChart
        data={[
          { id: "a", value: 1 },
          { id: "b", value: 2 },
        ]}
      />,
    );
    // 2 arc paths
    expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(2);
  });

  it("renders a SparklineChart path", () => {
    const { container } = render(
      <SparklineChart data={[1, 2, 3, 4, 5]} a11yLabel="trend" />,
    );
    expect(screen.getByLabelText("trend")).toBeTruthy();
    expect(container.querySelector("path")).toBeTruthy();
  });

  it("renders an AreaChart with gradient defs", () => {
    const { container } = render(
      <AreaChart
        xKey="x"
        yKey="y"
        series={[{ id: "s", data: [{ x: 0, y: 1 }, { x: 1, y: 2 }] }]}
      />,
    );
    expect(container.querySelector("defs")).toBeTruthy();
  });
});
