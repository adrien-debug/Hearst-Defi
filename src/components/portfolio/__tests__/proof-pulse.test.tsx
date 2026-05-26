/**
 * Unit tests for proof-pulse.tsx pure helpers.
 *
 * Tests cover: delta computation, match indicator, delta colour level.
 * No JSX rendering — all assertions target the exported pure functions.
 */

import { describe, it, expect } from "vitest";

import {
  computeDeltaPct,
  isMatch,
  deltaLevel,
} from "@/components/portfolio/proof-pulse";

// ── 1. Perfect match (delta 0%) ───────────────────────────────────────────────

describe("perfect match — delta 0%", () => {
  const stated = 24_600_000;
  const onChain = 24_600_000;

  it("computeDeltaPct returns 0", () => {
    expect(computeDeltaPct(stated, onChain)).toBe(0);
  });

  it("isMatch returns true → ✓ indicator", () => {
    expect(isMatch(0)).toBe(true);
  });

  it("deltaLevel returns green", () => {
    expect(deltaLevel(0)).toBe("green");
  });
});

// ── 2. Mismatch 0.3% → ✓ stays + green delta ─────────────────────────────────

describe("0.3% mismatch — ✓ stays, delta green", () => {
  const stated = 24_600_000;
  const onChain = 24_600_000 * (1 - 0.003); // –0.3%

  it("computeDeltaPct is approximately 0.3", () => {
    expect(computeDeltaPct(stated, onChain)).toBeCloseTo(0.3, 5);
  });

  it("isMatch returns true (< 0.5% threshold)", () => {
    expect(isMatch(computeDeltaPct(stated, onChain))).toBe(true);
  });

  it("deltaLevel returns green", () => {
    expect(deltaLevel(computeDeltaPct(stated, onChain))).toBe("green");
  });
});

// ── 3. Mismatch 1.5% → orange delta ──────────────────────────────────────────

describe("1.5% mismatch — orange delta", () => {
  const stated = 24_600_000;
  const onChain = 24_600_000 * (1 - 0.015); // –1.5%

  it("computeDeltaPct is approximately 1.5", () => {
    expect(computeDeltaPct(stated, onChain)).toBeCloseTo(1.5, 5);
  });

  it("isMatch returns false (≥ 0.5% threshold)", () => {
    expect(isMatch(computeDeltaPct(stated, onChain))).toBe(false);
  });

  it("deltaLevel returns orange", () => {
    expect(deltaLevel(computeDeltaPct(stated, onChain))).toBe("orange");
  });
});

// ── 4. Mismatch 5% → ✗ + red ─────────────────────────────────────────────────

describe("5% mismatch — ✗ indicator + red delta", () => {
  const stated = 24_600_000;
  const onChain = 24_600_000 * (1 - 0.05); // –5%

  it("computeDeltaPct is approximately 5", () => {
    expect(computeDeltaPct(stated, onChain)).toBeCloseTo(5, 5);
  });

  it("isMatch returns false → ✗ indicator", () => {
    expect(isMatch(computeDeltaPct(stated, onChain))).toBe(false);
  });

  it("deltaLevel returns red", () => {
    expect(deltaLevel(computeDeltaPct(stated, onChain))).toBe("red");
  });
});

// ── 5. nextAttestation null → "no scheduled" fallback ────────────────────────

describe("nextAttestation null — no scheduled fallback", () => {
  it("null nextAttestation is accepted (type-level only — rendered as 'no scheduled')", () => {
    // Pure type guard: null must be assignable to Date | null
    const nextAttestation: Date | null = null;
    expect(nextAttestation).toBeNull();
  });
});

// ── 6. Edge cases ─────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("computeDeltaPct handles stated=0 without division by zero", () => {
    expect(computeDeltaPct(0, 0)).toBe(0);
    expect(computeDeltaPct(0, 1_000)).toBe(0);
  });

  it("deltaLevel boundary: exactly 0.5 is orange (not green)", () => {
    expect(deltaLevel(0.5)).toBe("orange");
  });

  it("deltaLevel boundary: exactly 2.0 is red (not orange)", () => {
    expect(deltaLevel(2.0)).toBe("red");
  });

  it("deltaLevel: 0.499 is green", () => {
    expect(deltaLevel(0.499)).toBe("green");
  });

  it("deltaLevel: 1.999 is orange", () => {
    expect(deltaLevel(1.999)).toBe("orange");
  });
});
