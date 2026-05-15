import { describe, expect, it } from "vitest";
import {
  calcCalmar,
  calcMaxDrawdown,
  calcSharpe,
  calcSortino,
  calcVaR,
} from "../ratios";

describe("calcSharpe", () => {
  it("matches hand-calculated textbook case (monthly)", () => {
    // returns: [0.01, 0.02, -0.01, 0.03, 0.00], rf=0.02 annualized, periodsPerYear=12
    // rf/period = 1/600
    // mean(excess) = 1/120  (= 0.008333...)
    // sample stdev = sqrt(0.00025) ≈ 0.0158113883
    // sharpe/period = 0.527046277...
    // annualized = * sqrt(12) ≈ 1.825741858
    const sharpe = calcSharpe([0.01, 0.02, -0.01, 0.03, 0.0], 0.02, 12);
    expect(sharpe).toBeCloseTo(1.825741858, 6);
  });

  it("returns 0 for empty input", () => {
    expect(calcSharpe([], 0.02, 12)).toBe(0);
  });

  it("returns 0 for single element", () => {
    expect(calcSharpe([0.01], 0.02, 12)).toBe(0);
  });

  it("returns 0 for zero-variance series (avoids Infinity)", () => {
    expect(calcSharpe([0.01, 0.01, 0.01, 0.01], 0.0, 12)).toBe(0);
  });

  it("is negative when mean return is below risk-free rate", () => {
    const sharpe = calcSharpe([0.001, 0.002, -0.001, 0.003, 0.0], 0.12, 12);
    expect(sharpe).toBeLessThan(0);
  });
});

describe("calcSortino", () => {
  it("is greater than Sharpe when downside risk is small", () => {
    const returns = [0.02, 0.03, -0.005, 0.04, 0.01];
    const sharpe = calcSharpe(returns, 0.0, 12);
    const sortino = calcSortino(returns, 0.0, 12);
    expect(sortino).toBeGreaterThan(sharpe);
  });

  it("matches hand-calculated downside deviation case", () => {
    // returns: [0.02, 0.03, -0.005, 0.04, 0.01], target=0, monthly
    // only -0.005 contributes to downside → downsideSq = 0.000025
    // downsideDev = sqrt(0.000025 / 5) = sqrt(5e-6) ≈ 0.002236067977
    // excessMean = 0.019
    // sortino/period = 0.019 / 0.002236067977 ≈ 8.497058
    // annualized = sortino/period * sqrt(12) ≈ 29.434673
    const sortino = calcSortino([0.02, 0.03, -0.005, 0.04, 0.01], 0.0, 12);
    expect(sortino).toBeCloseTo(29.434673, 4);
  });

  it("returns 0 when no observation is below target (avoids Infinity)", () => {
    expect(calcSortino([0.01, 0.02, 0.03, 0.04], 0.0, 12)).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(calcSortino([], 0.0, 12)).toBe(0);
  });

  it("returns 0 for single element", () => {
    expect(calcSortino([0.01], 0.0, 12)).toBe(0);
  });
});

describe("calcVaR", () => {
  it("computes 95% historical VaR on a uniform [-0.10, 0.10] series", () => {
    // 21 returns from -0.10 to 0.10 in 0.01 steps. confidence=0.95.
    // alpha*(N-1) = 0.05 * 20 = 1.0 → exactly sorted[1] = -0.09 → VaR = 0.09
    const series: number[] = [];
    for (let i = -10; i <= 10; i++) series.push(i / 100);
    expect(calcVaR(series, 0.95)).toBeCloseTo(0.09, 10);
  });

  it("interpolates linearly between adjacent order statistics", () => {
    // 11 returns [-0.10..0.10] step 0.02. confidence=0.95.
    // alpha*(N-1) = 0.05 * 10 = 0.5 → midpoint of sorted[0]=-0.10 and sorted[1]=-0.08 → -0.09
    const series = [-0.1, -0.08, -0.06, -0.04, -0.02, 0, 0.02, 0.04, 0.06, 0.08, 0.1];
    expect(calcVaR(series, 0.95)).toBeCloseTo(0.09, 10);
  });

  it("returns 0 when the quantile is non-negative (no loss at that confidence)", () => {
    expect(calcVaR([0.01, 0.02, 0.03, 0.04, 0.05], 0.95)).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(calcVaR([], 0.95)).toBe(0);
  });

  it("returns 0 for invalid confidence", () => {
    expect(calcVaR([-0.05, 0.0, 0.05], 0)).toBe(0);
    expect(calcVaR([-0.05, 0.0, 0.05], 1)).toBe(0);
  });
});

describe("calcMaxDrawdown", () => {
  it("identifies clear peak-to-trough decline", () => {
    // peak 120 → trough 80 → dd = 40/120 = 1/3 ≈ 0.3333
    // later peak 130 has no deeper trough, so MDD stays 1/3
    expect(calcMaxDrawdown([100, 120, 110, 80, 90, 130])).toBeCloseTo(1 / 3, 10);
  });

  it("returns 0 for a monotonically increasing series", () => {
    expect(calcMaxDrawdown([100, 101, 102, 103, 104])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calcMaxDrawdown([])).toBe(0);
  });

  it("returns 0 for single element", () => {
    expect(calcMaxDrawdown([100])).toBe(0);
  });

  it("returns 0 when all values are zero", () => {
    expect(calcMaxDrawdown([0, 0, 0, 0])).toBe(0);
  });
});

describe("calcCalmar", () => {
  it("returns Infinity when there is no drawdown", () => {
    const returns = [0.01, 0.01, 0.01];
    const nav = [100, 101, 102.01, 103.0301];
    expect(calcCalmar(returns, nav, 12)).toBe(Infinity);
  });

  it("equals annualizedReturn / |maxDrawdown| for a known case", () => {
    // Returns: +20%, -25%, +30%  (3 monthly periods)
    // NAV: 100 → 120 → 90 → 117. MDD = (120-90)/120 = 0.25
    // growth = 1.2 * 0.75 * 1.3 = 1.17. annualized = 1.17^(12/3) - 1 = 1.17^4 - 1
    // = 1.87388721 - 1 = 0.87388721
    // calmar = 0.87388721 / 0.25 = 3.4955...
    const calmar = calcCalmar([0.2, -0.25, 0.3], [100, 120, 90, 117], 12);
    expect(calmar).toBeCloseTo(3.49554884, 6);
  });

  it("returns 0 for empty returns", () => {
    expect(calcCalmar([], [100, 110], 12)).toBe(0);
  });

  it("returns 0 for empty NAV", () => {
    expect(calcCalmar([0.01, 0.02], [], 12)).toBe(0);
  });
});
