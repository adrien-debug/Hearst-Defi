import { describe, expect, it } from "vitest";

import {
  aggregateLpPnl,
  computeLpPnl,
  daysHeldSince,
} from "../lp-pnl";

describe("computeLpPnl", () => {
  it("splits realized/unrealized and computes net return on contributed", () => {
    const pnl = computeLpPnl({
      contributedUsdc: 100_000,
      distributedUsdc: 5_000,
      accruedYieldUsdc: 2_000,
    });
    expect(pnl.realizedUsdc).toBe(5_000);
    expect(pnl.unrealizedUsdc).toBe(2_000);
    expect(pnl.totalReturnUsdc).toBe(7_000);
    expect(pnl.currentValueUsdc).toBe(102_000);
    expect(pnl.netReturnPct).toBe(7);
    expect(pnl.annualizedReturnPct).toBeNull();
  });

  it("annualises a partial-year holding (simple)", () => {
    const pnl = computeLpPnl({
      contributedUsdc: 100_000,
      distributedUsdc: 0,
      accruedYieldUsdc: 7_000,
      daysHeld: 182,
    });
    // 7% over 182 days → ~14.04% annualised
    expect(pnl.annualizedReturnPct).toBeCloseTo(14.04, 1);
  });

  it("never divides by zero contributed", () => {
    const pnl = computeLpPnl({
      contributedUsdc: 0,
      distributedUsdc: 0,
      accruedYieldUsdc: 0,
      daysHeld: 90,
    });
    expect(pnl.netReturnPct).toBe(0);
    expect(pnl.annualizedReturnPct).toBeNull();
    expect(Number.isFinite(pnl.currentValueUsdc)).toBe(true);
  });
});

describe("aggregateLpPnl", () => {
  it("sums dollars and computes return on total contributed", () => {
    const agg = aggregateLpPnl([
      { contributedUsdc: 100_000, distributedUsdc: 5_000, accruedYieldUsdc: 2_000, daysHeld: 180 },
      { contributedUsdc: 50_000, distributedUsdc: 1_000, accruedYieldUsdc: 1_500, daysHeld: 90 },
    ]);
    expect(agg.contributedUsdc).toBe(150_000);
    expect(agg.realizedUsdc).toBe(6_000);
    expect(agg.unrealizedUsdc).toBe(3_500);
    expect(agg.totalReturnUsdc).toBe(9_500);
    // 9_500 / 150_000 = 6.33%
    expect(agg.netReturnPct).toBeCloseTo(6.33, 1);
    expect(agg.annualizedReturnPct).not.toBeNull();
  });

  it("returns zeros for an empty portfolio", () => {
    const agg = aggregateLpPnl([]);
    expect(agg.contributedUsdc).toBe(0);
    expect(agg.netReturnPct).toBe(0);
    expect(agg.annualizedReturnPct).toBeNull();
  });
});

describe("daysHeldSince", () => {
  it("counts whole UTC days and floors negatives at 0", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(daysHeldSince(from, new Date("2026-01-11T06:00:00Z"))).toBe(10);
    expect(daysHeldSince(from, new Date("2025-12-01T00:00:00Z"))).toBe(0);
  });
});
