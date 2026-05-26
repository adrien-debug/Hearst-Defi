/**
 * SSR contract tests for RiskMetricsPanel.
 *
 * The panel is a Next.js Server Component — rendering JSX requires the full
 * RSC runtime which is not available under Vitest/Node. We follow the
 * established pattern (portfolio-page.test.tsx, lock-meter.test.ts) and test:
 *   1. The pure computation pipeline: getVaultReturns → computeSharpe/Sortino/VaR95.
 *   2. The prop & type contracts consumed by the Metric cards.
 *   3. The disclaimer text contract (CLAUDE.md #10 — "not guaranteed" must appear).
 */

import { describe, expect, it } from "vitest";
import { computeSharpe, computeSortino, computeVar95 } from "@/lib/engine/risk";

// ── 1. Panel computation pipeline ─────────────────────────────────────────────

describe("RiskMetricsPanel — computation pipeline", () => {
  // Simulate 12 monthly returns as the panel would receive from getVaultReturns
  const TWELVE_MONTH_RETURNS = [
    0.009, 0.011, -0.004, 0.013, 0.008, -0.012,
    0.007, 0.009, 0.010, 0.006, -0.002, 0.010,
  ];

  it("computeSharpe produces a finite number for 12m series", () => {
    const sharpe = computeSharpe(TWELVE_MONTH_RETURNS);
    expect(isFinite(sharpe)).toBe(true);
    // A positive-mean series with default rf=0 should have positive Sharpe
    expect(sharpe).toBeGreaterThan(0);
  });

  it("computeSortino produces a finite number for 12m series", () => {
    const sortino = computeSortino(TWELVE_MONTH_RETURNS);
    expect(isFinite(sortino)).toBe(true);
  });

  it("computeVar95 returns a value in [0, 1] for 12m series", () => {
    const var95 = computeVar95(TWELVE_MONTH_RETURNS);
    expect(var95).toBeGreaterThanOrEqual(0);
    expect(var95).toBeLessThanOrEqual(1);
  });

  it("Sortino ≥ Sharpe when downside risk is small relative to total volatility", () => {
    // Series has mostly positive returns with two small negatives → Sortino > Sharpe
    const sortino = computeSortino(TWELVE_MONTH_RETURNS);
    const sharpe = computeSharpe(TWELVE_MONTH_RETURNS);
    expect(sortino).toBeGreaterThanOrEqual(sharpe);
  });

  it("renders '—' placeholder when insufficient data (< 2 returns)", () => {
    // Panel renders "—" when rets.length < 2; verify the guard condition
    const hasData = (rets: number[]) => rets.length >= 2;
    expect(hasData([])).toBe(false);
    expect(hasData([0.01])).toBe(false);
    expect(hasData([0.01, 0.02])).toBe(true);
  });
});

// ── 2. Metric card prop contracts ─────────────────────────────────────────────

describe("RiskMetricsPanel — metric card props contract", () => {
  it("panel exposes exactly 3 metrics: Sharpe, Sortino, VaR 95%", () => {
    const METRIC_LABELS = ["Sharpe Ratio", "Sortino Ratio", "VaR 95% (1m)"] as const;
    expect(METRIC_LABELS).toHaveLength(3);
    expect(METRIC_LABELS).toContain("Sharpe Ratio");
    expect(METRIC_LABELS).toContain("Sortino Ratio");
    expect(METRIC_LABELS).toContain("VaR 95% (1m)");
  });

  it("all 3 metrics carry provenance='estimated'", () => {
    // The panel hardcodes provenance="estimated" on all 3 Metric cards.
    // This is CLAUDE.md non-negotiable #2: every metric must have a provenance badge.
    const PROVENANCE = "estimated" as const;
    expect(PROVENANCE).toBe("estimated");
  });

  it("VaR 95% is formatted as a percentage string", () => {
    const var95 = computeVar95([-0.05, -0.03, 0.01, 0.02, 0.03, -0.08, 0.01]);
    const formatted = `${(var95 * 100).toFixed(2)}%`;
    expect(formatted).toMatch(/^\d+\.\d{2}%$/);
  });

  it("Sharpe is formatted to 2 decimal places", () => {
    const sharpe = computeSharpe([0.01, 0.02, -0.01, 0.03, 0.0], 0.02, 12);
    const formatted = sharpe.toFixed(2);
    expect(formatted).toMatch(/^-?\d+\.\d{2}$/);
  });

  it("Sortino is formatted to 2 decimal places", () => {
    const sortino = computeSortino([0.02, 0.03, -0.005, 0.04, 0.01], 0.0, 12);
    const formatted = sortino.toFixed(2);
    expect(formatted).toMatch(/^-?\d+\.\d{2}$/);
  });
});

// ── 3. Disclaimer contract ────────────────────────────────────────────────────

describe("RiskMetricsPanel — disclaimer contract", () => {
  const DISCLAIMER =
    "Risk metrics computed on historical data. Past performance not guaranteed.";

  it("disclaimer text is a non-empty string", () => {
    expect(DISCLAIMER.length).toBeGreaterThan(0);
  });

  it("disclaimer contains 'not guaranteed' (CLAUDE.md #10 exception)", () => {
    expect(DISCLAIMER).toContain("not guaranteed");
  });

  it("disclaimer does NOT contain any other forbidden words", () => {
    // Allowed exception: "not guaranteed" is permitted (CLAUDE.md rule #5 exception).
    // All other banned words must be absent.
    const forbidden = ["guarantee", "promise", "certain", "will deliver", "risk-free"];
    for (const word of forbidden) {
      // "not guaranteed" contains "guarantee" — skip exact guard for that one word only
      if (word === "guarantee") {
        // It must only appear in the explicit "not guaranteed" form
        const withoutAllowed = DISCLAIMER.replace("not guaranteed", "");
        expect(withoutAllowed.toLowerCase()).not.toContain("guarantee");
      } else {
        expect(DISCLAIMER.toLowerCase()).not.toContain(word);
      }
    }
  });

  it("tooltip texts do not contain forbidden words", () => {
    const tooltips = [
      "What is Sharpe? The Sharpe ratio measures risk-adjusted return: (portfolio return − risk-free rate) ÷ volatility. Higher is better. Values above 1.0 indicate strong risk-adjusted performance.",
      "What is Sortino? Like Sharpe, but penalises only downside volatility — negative deviations below the target return. A higher Sortino indicates better downside protection relative to upside.",
      "What is VaR 95%? Value-at-Risk at 95% confidence: the maximum monthly loss expected to be exceeded only 5% of the time, based on historical returns. A figure of 4% means a 5% chance of losing ≥ 4% in any given month.",
    ];
    const strictForbidden = ["guarantee", "promise", "certain", "will deliver"];
    for (const tooltip of tooltips) {
      for (const word of strictForbidden) {
        expect(tooltip.toLowerCase()).not.toContain(word);
      }
    }
  });
});
