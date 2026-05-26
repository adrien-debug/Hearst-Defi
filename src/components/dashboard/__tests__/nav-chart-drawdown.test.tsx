/**
 * nav-chart-drawdown.test.tsx
 *
 * Verifies that the NAV 30d chart renders a drawdown shading overlay
 * (`<rect fill="var(--ct-status-danger)">`) whenever the series contains
 * a drawdown period.
 *
 * Uses renderToStaticMarkup (no DOM / no jsdom) consistent with the
 * other dashboard tests in this directory.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimeseriesSection } from "../timeseries-section";
import type { DashboardTimeseries } from "@/lib/data/dashboard";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeTimeseries(
  navValues: number[],
  apyValues?: Array<{ low: number; high: number }>,
): DashboardTimeseries {
  const nav30d = navValues.map((v, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    aum_usdc: v,
  }));
  const apy30d = (apyValues ?? []).map((p, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    apy_low: p.low,
    apy_high: p.high,
  }));
  return { nav30d, apy30d, source: "db" };
}

function render(data: DashboardTimeseries): string {
  return renderToStaticMarkup(<TimeseriesSection data={data} />);
}

// ── 1. drawdown overlay present when series dips ──────────────────────────────

describe("NavChart — drawdown shading", () => {
  it("renders at least one <rect> with ct-status-danger fill when there is a drawdown", () => {
    // Peak → dip → recovery
    const html = render(makeTimeseries([1_000_000, 900_000, 1_000_000]));
    expect(html).toContain("ct-status-danger");
  });

  it("drawdown rect has aria-hidden to keep chart accessible", () => {
    const html = render(makeTimeseries([1_000_000, 900_000, 1_000_000]));
    // The danger rect should not be announced by screen readers
    expect(html).toContain('aria-hidden="true"');
  });

  it("does NOT render a drawdown rect when series is monotonically increasing", () => {
    const html = render(makeTimeseries([1_000_000, 1_100_000, 1_200_000]));
    expect(html).not.toContain("ct-status-danger");
  });

  it("does NOT render a drawdown rect for an empty NAV series (shows empty state)", () => {
    const html = render(makeTimeseries([]));
    expect(html).not.toContain("ct-status-danger");
  });
});

// ── 2. snapshot for series with two drawdown periods ─────────────────────────

describe("NavChart — drawdown snapshot", () => {
  it("matches snapshot for a series with two distinct drawdown periods", () => {
    const values = [
      1_000_000,
      950_000,
      920_000,
      1_000_000,
      1_050_000,
      1_000_000,
      990_000,
      1_050_000,
    ];
    const html = render(makeTimeseries(values));
    // Snapshot just the SVG portion so the test is resilient to Card markup changes
    const svgStart = html.indexOf("<svg");
    const svgEnd = html.lastIndexOf("</svg>") + "</svg>".length;
    const svgHtml = html.slice(svgStart, svgEnd);
    expect(svgHtml).toMatchSnapshot();
  });
});
