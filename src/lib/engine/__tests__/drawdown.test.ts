import { describe, expect, it } from "vitest";
import { computeDrawdownPeriods } from "../drawdown";
import type { NavPoint } from "../drawdown";

// ── helpers ───────────────────────────────────────────────────────────────────

function pts(values: number[]): NavPoint[] {
  return values.map((v, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    aum_usdc: v,
  }));
}

// ── 1. edge cases ─────────────────────────────────────────────────────────────

describe("computeDrawdownPeriods — edge cases", () => {
  it("returns [] for empty series", () => {
    expect(computeDrawdownPeriods([])).toEqual([]);
  });

  it("returns [] for single-point series", () => {
    expect(computeDrawdownPeriods(pts([1_000_000]))).toEqual([]);
  });

  it("returns [] for strictly increasing series", () => {
    expect(
      computeDrawdownPeriods(pts([1_000, 1_100, 1_200, 1_300])),
    ).toEqual([]);
  });

  it("returns [] for flat series (no drawdown)", () => {
    expect(
      computeDrawdownPeriods(pts([1_000, 1_000, 1_000])),
    ).toEqual([]);
  });
});

// ── 2. single drawdown period ─────────────────────────────────────────────────

describe("computeDrawdownPeriods — single drawdown", () => {
  it("detects one drawdown that fully recovers", () => {
    // peak at idx 0 (1000), dip at idx 1 (800), recovery at idx 2 (1000)
    const result = computeDrawdownPeriods(pts([1_000, 800, 1_000]));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ start: 0, end: 1 });
  });

  it("computes depth as fraction of running max", () => {
    // dip from 1000 → 600 = 40% drawdown
    const result = computeDrawdownPeriods(pts([1_000, 600, 1_000]));
    expect(result[0]!.depth).toBeCloseTo(0.4, 6);
  });

  it("captures period still open at series end", () => {
    const result = computeDrawdownPeriods(pts([1_000, 900, 850]));
    expect(result).toHaveLength(1);
    expect(result[0]!.end).toBe(2); // last index
  });

  it("depth reflects worst point within the period", () => {
    // Peak 1000 → 950 → 700 → 800 (still below peak) — worst depth = 30%
    const result = computeDrawdownPeriods(pts([1_000, 950, 700, 800]));
    expect(result[0]!.depth).toBeCloseTo(0.3, 6);
  });
});

// ── 3. multiple drawdown periods ──────────────────────────────────────────────

describe("computeDrawdownPeriods — multiple periods", () => {
  it("returns two separate periods", () => {
    // Up → down → recover → up-more → down again
    const values = [1_000, 800, 1_000, 1_200, 900];
    const result = computeDrawdownPeriods(pts(values));
    expect(result).toHaveLength(2);
  });

  it("periods do not overlap (end < next start)", () => {
    const values = [1_000, 800, 1_000, 1_200, 900];
    const result = computeDrawdownPeriods(pts(values));
    const [first, second] = result;
    expect(first!.end).toBeLessThan(second!.start);
  });

  it("running max updates after recovery — second period has correct depth", () => {
    // First peak 1000, dip 800 (20%), recovery to 1200 (new max), dip to 1100 (8.33%)
    const values = [1_000, 800, 1_200, 1_100];
    const result = computeDrawdownPeriods(pts(values));
    expect(result).toHaveLength(2);
    expect(result[1]!.depth).toBeCloseTo(100 / 1200, 5);
  });
});

// ── 4. snapshot ───────────────────────────────────────────────────────────────

describe("computeDrawdownPeriods — snapshot", () => {
  it("matches snapshot for a 10-point series with two drawdown periods", () => {
    const values = [
      1_000_000, // 0 peak
      950_000,   // 1 dd1 start
      920_000,   // 2
      980_000,   // 3 dd1 end (still < 1M)
      1_000_000, // 4 recovery
      1_050_000, // 5 new peak
      1_000_000, // 6 dd2 start
      990_000,   // 7
      1_050_000, // 8 recovery
      1_060_000, // 9
    ];
    const result = computeDrawdownPeriods(pts(values));
    expect(result).toMatchSnapshot();
  });
});
