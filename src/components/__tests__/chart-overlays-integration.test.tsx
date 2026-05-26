/**
 * Integration tests — chart overlay presence.
 *
 * Asserts that ChartProvenanceCorner and ChartDisclaimerUnderlay are rendered
 * (or absent) in the correct chart components after Stream W integration.
 *
 * Uses renderToStaticMarkup (node environment, no jsdom) — consistent with
 * the project's vitest config (`environment: "node"`).
 *
 * Projectif charts (disclaimer present):
 *   BacktestChart, NavSparkline, ValueChart, TimeToTargetChart
 *
 * Historical / non-projectif charts (no disclaimer):
 *   AllocationDonut, TimeseriesSection
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

// ── Helpers ───────────────────────────────────────────────────────────────────

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

/** ChartProvenanceCorner renders as a div with role="img" and data-provenance-corner in its aria-label */
function hasProvenanceCorner(html: string): boolean {
  // The component renders a div with aria-label containing "Data provenance:"
  return html.includes("Data provenance:");
}

/** ChartDisclaimerUnderlay renders as a div with aria-hidden="true" containing the disclaimer text */
function hasDisclaimerUnderlay(html: string): boolean {
  return html.includes("projections") && html.includes("not guaranteed");
}

// ── 1. BacktestChart — projectif ──────────────────────────────────────────────

import { BacktestChart } from "@/components/scenario/backtest-chart";
import type { MonthlyPoint } from "@/lib/engine/types";

const MONTHLY_SERIES: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => ({
  month: `2026-${String(i + 1).padStart(2, "0")}`,
  valueUsdc: 1_000_000 + i * 10_000,
  distributionUsdc: i > 0 ? 5_000 : 0,
}));

describe("BacktestChart — overlay integration", () => {
  it("renders ChartProvenanceCorner", () => {
    const html = render(<BacktestChart series={MONTHLY_SERIES} />);
    expect(hasProvenanceCorner(html)).toBe(true);
  });

  it("renders ChartDisclaimerUnderlay (projectif)", () => {
    const html = render(<BacktestChart series={MONTHLY_SERIES} />);
    expect(hasDisclaimerUnderlay(html)).toBe(true);
  });
});

// ── 2. AllocationDonut — historique / non-projectif ───────────────────────────

import { AllocationDonut } from "@/components/dashboard/dashboard-charts";
import type { AllocationSegment } from "@/components/dashboard/dashboard-charts";

const FLAT_SEGMENTS: AllocationSegment[] = [
  { bucket: "mining", pct: 62 },
  { bucket: "btc_tactical", pct: 18 },
  { bucket: "usdc_base", pct: 12 },
  { bucket: "stable_reserve", pct: 8 },
];

describe("AllocationDonut — overlay integration", () => {
  it("renders ChartProvenanceCorner", () => {
    const html = render(
      <AllocationDonut segments={FLAT_SEGMENTS} ariaLabel="test donut" />,
    );
    expect(hasProvenanceCorner(html)).toBe(true);
  });

  it("does NOT render ChartDisclaimerUnderlay (non-projectif)", () => {
    const html = render(
      <AllocationDonut segments={FLAT_SEGMENTS} ariaLabel="test donut" />,
    );
    expect(hasDisclaimerUnderlay(html)).toBe(false);
  });
});

// ── 3. TimeseriesSection — historique ────────────────────────────────────────

import { TimeseriesSection } from "@/components/dashboard/timeseries-section";
import type { DashboardTimeseries } from "@/lib/data/dashboard";

const TIMESERIES_DATA: DashboardTimeseries = {
  source: "db",
  nav30d: Array.from({ length: 10 }, (_, i) => ({
    date: `2026-05-${String(i + 1).padStart(2, "0")}`,
    aum_usdc: 24_500_000 + i * 100_000,
  })),
  apy30d: Array.from({ length: 10 }, (_, i) => ({
    date: `2026-05-${String(i + 1).padStart(2, "0")}`,
    apy_low: 8.5,
    apy_high: 12.8,
  })),
};

describe("TimeseriesSection — overlay integration", () => {
  it("renders ChartProvenanceCorner", () => {
    const html = render(<TimeseriesSection data={TIMESERIES_DATA} />);
    expect(hasProvenanceCorner(html)).toBe(true);
  });
});
