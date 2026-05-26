/**
 * IRR pure-function tests — 2 vectors.
 *
 * Vector A: simple 1-year holding, one distribution, terminal NAV.
 *   Invested $100k on 2025-01-01.
 *   Received $6k distribution on 2025-07-01 (6 months in).
 *   Terminal NAV $103k on 2026-01-01.
 *   Net cash out: $100k. Net cash in: $6k + $103k = $109k over 1 year.
 *   Net simple return: 9% over 1 year → IRR ≈ 9% (Newton gives exact).
 *
 * Vector B: no distributions, steady accrual over ~6 months.
 *   Invested $250k on 2025-06-01.
 *   No interim distributions.
 *   Terminal NAV $263.75k on 2025-12-01 (183 days).
 *   Net return ≈ 5.5% over 183/365 ≈ ~10.97% annualised (act/365 XIRR).
 */

import { describe, expect, it } from "vitest";
import { xirr, irrAnnualized } from "../irr";

// ---------------------------------------------------------------------------
// Vector A — 1 distribution, 1-year holding
// ---------------------------------------------------------------------------

describe("xirr — Vector A (1-year, 1 distribution)", () => {
  const t0 = new Date("2025-01-01T00:00:00Z");
  const t6m = new Date("2025-07-01T00:00:00Z");
  const t12m = new Date("2026-01-01T00:00:00Z");

  const cashFlows = [
    { amountUsdc: -100_000, date: t0 },
    { amountUsdc:    6_000, date: t6m },
    { amountUsdc:  103_000, date: t12m },
  ];

  it("returns a finite number", () => {
    const result = xirr(cashFlows);
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!)).toBe(true);
  });

  it("approximates 9% annualised IRR (±0.5%)", () => {
    const result = xirr(cashFlows)!;
    // Net inflows = 109k over 1 year on 100k investment → 9%
    expect(result).toBeGreaterThan(0.085);
    expect(result).toBeLessThan(0.095);
  });

  it("result is expressed as a decimal (not a percent)", () => {
    const result = xirr(cashFlows)!;
    expect(result).toBeLessThan(1); // 9% → 0.09, not 9.0
  });
});

// ---------------------------------------------------------------------------
// Vector B — no distributions, 183-day holding
// ---------------------------------------------------------------------------

describe("xirr — Vector B (6-month hold, no distributions)", () => {
  const t0 = new Date("2025-06-01T00:00:00Z");
  const t6m = new Date("2025-12-01T00:00:00Z"); // 183 days later

  const PRINCIPAL = 250_000;
  const TERMINAL_NAV = 263_750; // 5.5% simple return over 183 days

  const cashFlows = [
    { amountUsdc: -PRINCIPAL, date: t0 },
    { amountUsdc: TERMINAL_NAV, date: t6m },
  ];

  it("returns a finite number", () => {
    const result = xirr(cashFlows);
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!)).toBe(true);
  });

  it("annualised IRR > 10% for 5.5% simple return over ~6 months", () => {
    // 5.5% over 183/365 ≈ 10.96% annualised (act/365)
    const result = xirr(cashFlows)!;
    expect(result * 100).toBeGreaterThan(10.5);
    expect(result * 100).toBeLessThan(11.5);
  });

  it("IRR is positive for a profitable trade", () => {
    const result = xirr(cashFlows)!;
    expect(result).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("xirr — edge cases", () => {
  it("returns null for fewer than 2 cash flows", () => {
    expect(xirr([])).toBeNull();
    expect(xirr([{ amountUsdc: -100_000, date: new Date() }])).toBeNull();
  });

  it("returns null when all cash flows are the same sign", () => {
    const allNeg = [
      { amountUsdc: -100, date: new Date("2025-01-01") },
      { amountUsdc: -200, date: new Date("2025-06-01") },
    ];
    expect(xirr(allNeg)).toBeNull();

    const allPos = [
      { amountUsdc: 100, date: new Date("2025-01-01") },
      { amountUsdc: 200, date: new Date("2025-06-01") },
    ];
    expect(xirr(allPos)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// irrAnnualized convenience wrapper
// ---------------------------------------------------------------------------

describe("irrAnnualized", () => {
  it("produces the same result as xirr for equivalent inputs", () => {
    const subscribedAt = new Date("2025-01-01T00:00:00Z");
    const asOf = new Date("2026-01-01T00:00:00Z");

    const result = irrAnnualized({
      costBasisUsdc: 100_000,
      subscribedAt,
      distributionsUsdc: [
        { amountUsdc: 6_000, date: new Date("2025-07-01T00:00:00Z") },
      ],
      currentNavUsdc: 103_000,
      asOf,
    });

    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0.08);
    expect(result!).toBeLessThan(0.10);
  });

  it("returns null when costBasis is 0", () => {
    const result = irrAnnualized({
      costBasisUsdc: 0,
      subscribedAt: new Date("2025-01-01"),
      distributionsUsdc: [],
      currentNavUsdc: 1_000,
      asOf: new Date("2026-01-01"),
    });
    expect(result).toBeNull();
  });

  it("returns a decimal IRR (not a percent)", () => {
    const result = irrAnnualized({
      costBasisUsdc: 100_000,
      subscribedAt: new Date("2025-01-01T00:00:00Z"),
      distributionsUsdc: [],
      currentNavUsdc: 110_000, // 10% NAV gain
      asOf: new Date("2026-01-01T00:00:00Z"),
    });
    expect(result).not.toBeNull();
    expect(Math.abs(result!)).toBeLessThan(1); // 10% = 0.10, not 10
  });
});
