import { describe, expect, it } from "vitest";

import { monthlyReturn, monthlyReturnFromInputs } from "../monthly-return";

describe("monthlyReturn — canonical formula", () => {
  it("returns the pure NAV ratio when distribution = 0", () => {
    expect(monthlyReturn(1_000_000, 1_010_000, 0)).toBeCloseTo(0.01, 12);
  });

  it("adds the distribution back to the ending NAV (TWR with dist add-back)", () => {
    // NAV drops 1% because a distribution was paid out — the true period
    // return is flat, not -1%.
    expect(monthlyReturn(1_000_000, 990_000, 10_000)).toBeCloseTo(0, 12);
  });

  it("returns 0 when navStart is non-positive (cannot ratio)", () => {
    expect(monthlyReturn(0, 1_000, 0)).toBe(0);
    expect(monthlyReturn(-100, 1_000, 0)).toBe(0);
  });

  it("returns 0 when navStart or navEnd is NaN", () => {
    expect(monthlyReturn(Number.NaN, 1_000_000, 0)).toBe(0);
    expect(monthlyReturn(1_000_000, Number.NaN, 0)).toBe(0);
  });

  it("clamps a negative distribution to 0 (never flips sign)", () => {
    expect(monthlyReturn(1_000_000, 1_010_000, -50_000)).toBeCloseTo(0.01, 12);
  });

  it("defaults distribution to 0 when omitted", () => {
    expect(monthlyReturn(1_000_000, 1_020_000)).toBeCloseTo(0.02, 12);
  });

  it("treats a non-finite distribution as 0", () => {
    expect(monthlyReturn(1_000_000, 1_020_000, Number.POSITIVE_INFINITY)).toBeCloseTo(
      0.02,
      12,
    );
  });
});

describe("monthlyReturnFromInputs — object form", () => {
  it("matches the positional form", () => {
    const r1 = monthlyReturn(500_000, 510_000, 5_000);
    const r2 = monthlyReturnFromInputs({
      navStart: 500_000,
      navEnd: 510_000,
      distribution: 5_000,
    });
    expect(r1).toBe(r2);
  });

  it("treats missing distribution as 0", () => {
    expect(
      monthlyReturnFromInputs({ navStart: 1_000, navEnd: 1_010 }),
    ).toBeCloseTo(0.01, 12);
  });
});
