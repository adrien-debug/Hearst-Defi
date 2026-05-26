/**
 * Unit tests for computeTimeToCash (src/lib/data/time-to-cash.ts).
 *
 * All calculations are pure-function, asOf injected — no Date.now(), no I/O.
 *
 * Tests:
 *   1. cycleStart -15d, cycleDays=30 → 50% progress, 15 days remaining
 *   2. Day 30 (cycleStart = asOf - 30d) → 100% progress
 *   3. Cycle expired (daysRemaining < 0) → clamped to 0
 *   4. hoursRemaining correctly derived from partial-day remainder
 *   5. cycleDays=0 edge case → progressPct=0, no division by zero
 */

import { describe, it, expect } from "vitest";
import { computeTimeToCash } from "@/lib/data/time-to-cash";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

function daysAgo(n: number, from: Date): Date {
  return new Date(from.getTime() - n * MS_PER_DAY);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("computeTimeToCash", () => {
  it("1. cycleStart -15d, cycleDays=30 → 50% progress, 15 days remaining", () => {
    const asOf = new Date("2026-06-16T00:00:00Z");
    const cycleStart = daysAgo(15, asOf); // 15 days elapsed
    const result = computeTimeToCash({ cycleStart, cycleDays: 30, asOf });

    expect(result.daysElapsed).toBe(15);
    expect(result.progressPct).toBeCloseTo(50, 5);
    expect(result.daysRemaining).toBe(15);
    // 0 hours left on top of the 15 full days (exactly on a day boundary)
    expect(result.hoursRemaining).toBe(0);
    // nextDistributionAt is 30 days after cycleStart
    expect(result.nextDistributionAt.getTime()).toBe(
      cycleStart.getTime() + 30 * MS_PER_DAY,
    );
  });

  it("2. Day 30 — cycle exactly complete → 100% progress, 0 days remaining", () => {
    const asOf = new Date("2026-07-01T00:00:00Z");
    const cycleStart = daysAgo(30, asOf); // exactly 30 days ago
    const result = computeTimeToCash({ cycleStart, cycleDays: 30, asOf });

    expect(result.daysElapsed).toBe(30);
    expect(result.progressPct).toBe(100);
    expect(result.daysRemaining).toBe(0);
    expect(result.hoursRemaining).toBe(0);
  });

  it("3. Cycle expired (asOf 5 days past cycle end) → progressPct clamped at 100, daysRemaining=0", () => {
    const asOf = new Date("2026-07-06T00:00:00Z");
    const cycleStart = daysAgo(35, asOf); // 35 days ago, but cycle is only 30 days
    const result = computeTimeToCash({ cycleStart, cycleDays: 30, asOf });

    // progressPct must never exceed 100
    expect(result.progressPct).toBe(100);
    // daysRemaining must never go negative — clamped to 0
    expect(result.daysRemaining).toBe(0);
    expect(result.hoursRemaining).toBe(0);
  });

  it("4. Partial day remaining — hoursRemaining reflects sub-day difference", () => {
    // cycleStart is 29 days and 18 hours ago.
    // daysElapsed = Math.floor(29.75) = 29 (integer-day granularity).
    // nextDistributionAt = cycleStart + 30d = asOf + 6h.
    // remainingMs = 6h → daysRemaining=0, hoursRemaining=6.
    // progressPct = (29 / 30) * 100 ≈ 96.67%
    const asOf = new Date("2026-06-30T18:00:00Z");
    const cycleStart = new Date(asOf.getTime() - (29 * MS_PER_DAY + 18 * 3_600_000));
    const result = computeTimeToCash({ cycleStart, cycleDays: 30, asOf });

    expect(result.daysRemaining).toBe(0);
    expect(result.hoursRemaining).toBe(6);
    // progressPct = floor(29.75) / 30 * 100 ≈ 96.67%
    expect(result.progressPct).toBeCloseTo(96.67, 1);
    expect(result.progressPct).toBeLessThanOrEqual(100);
  });

  it("5. cycleDays=0 edge case → progressPct=0, no division by zero", () => {
    const asOf = new Date("2026-06-01T00:00:00Z");
    const cycleStart = daysAgo(5, asOf);
    const result = computeTimeToCash({ cycleStart, cycleDays: 0, asOf });

    expect(result.progressPct).toBe(0);
    // No exception thrown
  });

  it("cycleStart in the future → progressPct clamped to 0", () => {
    const asOf = new Date("2026-06-01T00:00:00Z");
    // cycleStart 5 days in the future
    const cycleStart = new Date(asOf.getTime() + 5 * MS_PER_DAY);
    const result = computeTimeToCash({ cycleStart, cycleDays: 30, asOf });

    expect(result.progressPct).toBe(0);
    expect(result.daysRemaining).toBeGreaterThan(0);
  });
});
