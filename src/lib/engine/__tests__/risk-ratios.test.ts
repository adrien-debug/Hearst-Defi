/**
 * Tests for the three statistical risk-ratio helpers added to risk.ts:
 *   computeSharpe, computeSortino, computeVar95
 *
 * These are thin facades over the thoroughly-tested primitives in ratios.ts;
 * we validate (a) the known-vector case and (b) edge-case forwarding.
 */

import { describe, expect, it } from "vitest";
import { computeSharpe, computeSortino, computeVar95 } from "../risk";

// ── computeSharpe ─────────────────────────────────────────────────────────────

describe("computeSharpe", () => {
  it("matches textbook monthly series (known vector)", () => {
    // returns: [0.01, 0.02, -0.01, 0.03, 0.00]
    // rf=0.02 annualized, periodsPerYear=12
    // Expected ≈ 1.825741858 (same fixture as ratios.test.ts)
    const result = computeSharpe([0.01, 0.02, -0.01, 0.03, 0.0], 0.02, 12);
    expect(result).toBeCloseTo(1.825741858, 4);
  });

  it("defaults riskFreeRate to 0 and periodsPerYear to 12", () => {
    // With rf=0 and positive mean return, Sharpe should be > 0
    const result = computeSharpe([0.01, 0.02, 0.015, 0.018]);
    expect(result).toBeGreaterThan(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeSharpe([])).toBe(0);
  });

  it("returns 0 for single element", () => {
    expect(computeSharpe([0.05])).toBe(0);
  });

  it("returns 0 for zero-variance series (avoids Infinity)", () => {
    expect(computeSharpe([0.01, 0.01, 0.01, 0.01])).toBe(0);
  });

  it("is negative when mean return is below risk-free rate", () => {
    const result = computeSharpe([0.001, 0.002, -0.001, 0.003, 0.0], 0.12, 12);
    expect(result).toBeLessThan(0);
  });

  it("accepts a readonly array without mutation", () => {
    const arr = [0.01, 0.02, -0.01] as const;
    expect(() => computeSharpe(arr)).not.toThrow();
  });
});

// ── computeSortino ────────────────────────────────────────────────────────────

describe("computeSortino", () => {
  it("matches hand-calculated downside-deviation case", () => {
    // Same fixture as ratios.test.ts — expected ≈ 29.434673
    const result = computeSortino([0.02, 0.03, -0.005, 0.04, 0.01], 0.0, 12);
    expect(result).toBeCloseTo(29.434673, 3);
  });

  it("is greater than Sharpe when downside risk is small", () => {
    const returns = [0.02, 0.03, -0.005, 0.04, 0.01];
    expect(computeSortino(returns)).toBeGreaterThan(computeSharpe(returns));
  });

  it("defaults targetReturn to 0 and periodsPerYear to 12", () => {
    const result = computeSortino([0.01, -0.02, 0.03]);
    expect(typeof result).toBe("number");
    expect(isFinite(result)).toBe(true);
  });

  it("returns 0 when no observation is below target (avoids Infinity)", () => {
    expect(computeSortino([0.01, 0.02, 0.03, 0.04])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeSortino([])).toBe(0);
  });

  it("accepts a readonly array without mutation", () => {
    const arr = [0.01, -0.01, 0.02] as const;
    expect(() => computeSortino(arr)).not.toThrow();
  });
});

// ── computeVar95 ──────────────────────────────────────────────────────────────

describe("computeVar95", () => {
  it("computes 95% historical VaR on a uniform [-0.10, 0.10] series", () => {
    // 21 returns from -0.10 to 0.10 in 0.01 steps; VaR95 = 0.09
    const series: number[] = [];
    for (let i = -10; i <= 10; i++) series.push(i / 100);
    expect(computeVar95(series)).toBeCloseTo(0.09, 6);
  });

  it("returns 0 when all returns are positive (no loss at the 95% quantile)", () => {
    expect(computeVar95([0.01, 0.02, 0.03, 0.04, 0.05])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeVar95([])).toBe(0);
  });

  it("returns a positive number for a series with losses", () => {
    const result = computeVar95([-0.05, -0.03, 0.01, 0.02, 0.03, -0.08, 0.01, 0.02]);
    expect(result).toBeGreaterThan(0);
  });

  it("result is a finite number in [0, 1] for realistic monthly returns", () => {
    const returns = [0.009, 0.011, -0.004, 0.013, 0.008, -0.012, 0.007, 0.009, 0.01, 0.006, -0.002, 0.01];
    const result = computeVar95(returns);
    expect(isFinite(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("accepts a readonly array without mutation", () => {
    const arr = [-0.01, 0.02, -0.03] as const;
    expect(() => computeVar95(arr)).not.toThrow();
  });
});
