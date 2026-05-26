/**
 * Unit tests for the pure helpers exported from lock-meter.tsx.
 *
 * The component is a Server Component; DOM rendering tests are out of scope
 * for this vitest/node environment. We cover:
 *   1. 50% progress — lockStart 30 days before asOf, softLockup = 60
 *   2. 100% progress + isUnlocked — lockStart 100 days before asOf, softLockup = 60
 *   3. 0% progress — lockStart = asOf (just started)
 *   4. formatBps — 150 bps → "1.5%"
 *   5. aria label string derivation (via computeLockMeter + progressPct round)
 */

import { describe, it, expect } from "vitest";
import { computeLockMeter, formatBps, clamp } from "../lock-meter";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

function daysAgo(n: number, from: Date): Date {
  return new Date(from.getTime() - n * MS_PER_DAY);
}

// ── Test cases ────────────────────────────────────────────────────────────────

describe("computeLockMeter", () => {
  it("1. lockStart 30 days before asOf, softLockup=60 → 50% progress", () => {
    const asOf = new Date("2026-06-01T00:00:00Z");
    const lockStart = daysAgo(30, asOf);
    const result = computeLockMeter(lockStart, 60, asOf);

    expect(result.daysElapsed).toBe(30);
    expect(result.progressPct).toBeCloseTo(50, 5);
    expect(result.daysRemaining).toBe(30);
    expect(result.isUnlocked).toBe(false);
    // Unlock date should be 60 days after lockStart = 30 days after asOf
    expect(result.unlockDate.getTime()).toBe(
      lockStart.getTime() + 60 * MS_PER_DAY,
    );
  });

  it("2. lockStart 100 days before asOf, softLockup=60 → 100% progress + isUnlocked", () => {
    const asOf = new Date("2026-06-01T00:00:00Z");
    const lockStart = daysAgo(100, asOf);
    const result = computeLockMeter(lockStart, 60, asOf);

    expect(result.daysElapsed).toBe(100);
    // progressPct is clamped at 100
    expect(result.progressPct).toBe(100);
    expect(result.daysRemaining).toBe(0);
    expect(result.isUnlocked).toBe(true);
  });

  it("3. lockStart = asOf (today, day 0) → 0% progress, unlock in softLockupDays", () => {
    const asOf = new Date("2026-06-01T00:00:00Z");
    const lockStart = new Date(asOf.getTime()); // same moment
    const result = computeLockMeter(lockStart, 60, asOf);

    expect(result.daysElapsed).toBe(0);
    expect(result.progressPct).toBe(0);
    expect(result.daysRemaining).toBe(60);
    expect(result.isUnlocked).toBe(false);
    expect(result.unlockDate.getTime()).toBe(
      asOf.getTime() + 60 * MS_PER_DAY,
    );
  });

  it("progressPct is clamped: negative daysElapsed → 0%", () => {
    // lockStart in the future (edge case: asOf before lockStart)
    const asOf = new Date("2026-06-01T00:00:00Z");
    const lockStart = new Date(asOf.getTime() + 5 * MS_PER_DAY); // 5 days in future
    const result = computeLockMeter(lockStart, 60, asOf);

    // daysElapsed is negative, progressPct clamped to 0
    expect(result.progressPct).toBe(0);
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.isUnlocked).toBe(false);
  });

  it("exact unlock boundary: lockStart exactly softLockupDays before asOf → daysRemaining=0, isUnlocked=true", () => {
    const asOf = new Date("2026-06-01T00:00:00Z");
    const lockStart = daysAgo(60, asOf);
    const result = computeLockMeter(lockStart, 60, asOf);

    expect(result.daysElapsed).toBe(60);
    expect(result.progressPct).toBe(100);
    expect(result.daysRemaining).toBe(0);
    expect(result.isUnlocked).toBe(true);
  });
});

describe("formatBps", () => {
  it("4. 150 bps → '1.5%'", () => {
    expect(formatBps(150)).toBe("1.5%");
  });

  it("200 bps (whole number) → '2%'", () => {
    expect(formatBps(200)).toBe("2%");
  });

  it("25 bps → '0.3%' (0.25 rounds up to 0.3 via toFixed(1))", () => {
    // 25 / 100 = 0.25 → toFixed(1) = "0.3" (rounding) in JS
    // Let's verify the actual JS behavior:
    const pct = 25 / 100; // 0.25
    const expected = `${pct.toFixed(1)}%`; // "0.3%"
    expect(formatBps(25)).toBe(expected);
  });

  it("0 bps → '0%'", () => {
    expect(formatBps(0)).toBe("0%");
  });

  it("100 bps → '1%'", () => {
    expect(formatBps(100)).toBe("1%");
  });
});

describe("a11y attributes — progressPct round values", () => {
  it("5. aria-valuenow reflects Math.round(progressPct)", () => {
    const asOf = new Date("2026-06-01T00:00:00Z");

    // 30/60 = exactly 50
    const r50 = computeLockMeter(daysAgo(30, asOf), 60, asOf);
    expect(Math.round(r50.progressPct)).toBe(50);

    // 100 days / 60 day lockup → clamped at 100
    const r100 = computeLockMeter(daysAgo(100, asOf), 60, asOf);
    expect(Math.round(r100.progressPct)).toBe(100);

    // 0 days elapsed → 0
    const r0 = computeLockMeter(new Date(asOf), 60, asOf);
    expect(Math.round(r0.progressPct)).toBe(0);
  });
});

describe("clamp helper", () => {
  it("returns the value when within bounds", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("clamps to min when value is below", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it("clamps to max when value is above", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });
});
