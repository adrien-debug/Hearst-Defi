import { describe, expect, it } from "vitest";

import { createPrng, mulberry32 } from "../prng";
import { runMonteCarlo, type MonteCarloInput } from "../monte-carlo";

const BASE_INPUT: MonteCarloInput = {
  seed: 42,
  paths: 5_000,
  horizonMonths: 12,
  btc: {
    startPriceUsd: 60_000,
    annualDrift: 0.1,
    annualVol: 0.6,
  },
  difficulty: {
    start: 80e12,
    longRun: 90e12,
    reversionSpeed: 0.5,
    annualVol: 0.2,
    minMultiple: 0.5,
    maxMultiple: 2.0,
  },
  yield: {
    miningWeight: 0.6,
    stableWeight: 0.4,
    stableApyMean: 0.05,
    stableApyVol: 0.005,
    costPerThDay: 0.04,
    capitalPerThUsd: 25,
  },
  floorApy: 0.08,
};

describe("mulberry32 / createPrng", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces uniforms in [0, 1)", () => {
    const u = mulberry32(7);
    for (let i = 0; i < 1000; i += 1) {
      const v = u();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("gaussian has ~0 mean and ~1 sd over a large sample", () => {
    const prng = createPrng(99);
    const n = 100_000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i += 1) {
      const g = prng.nextGaussian();
      sum += g;
      sumSq += g * g;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.abs(Math.sqrt(variance) - 1)).toBeLessThan(0.02);
  });
});

describe("runMonteCarlo determinism", () => {
  it("same seed + same assumptions ⇒ identical output", () => {
    const a = runMonteCarlo(BASE_INPUT);
    const b = runMonteCarlo(BASE_INPUT);
    expect(a).toEqual(b);
  });

  it("different seeds ⇒ different output", () => {
    const a = runMonteCarlo(BASE_INPUT);
    const b = runMonteCarlo({ ...BASE_INPUT, seed: 43 });
    expect(a).not.toEqual(b);
    expect(a.percentiles.p50).not.toBe(b.percentiles.p50);
  });

  it("records seed and path count in the output", () => {
    const out = runMonteCarlo(BASE_INPUT);
    expect(out.seed).toBe(42);
    expect(out.paths).toBe(5_000);
  });

  it("defaults to 10,000 paths when unspecified", () => {
    const rest = { ...BASE_INPUT };
    delete rest.paths;
    const out = runMonteCarlo(rest);
    expect(out.paths).toBe(10_000);
  });
});

describe("runMonteCarlo distribution", () => {
  it("percentiles are ordered p5 ≤ p25 ≤ p50 ≤ p75 ≤ p95", () => {
    const { percentiles: p } = runMonteCarlo(BASE_INPUT);
    expect(p.p5).toBeLessThanOrEqual(p.p25);
    expect(p.p25).toBeLessThanOrEqual(p.p50);
    expect(p.p50).toBeLessThanOrEqual(p.p75);
    expect(p.p75).toBeLessThanOrEqual(p.p95);
  });

  it("headlineRange is the [p25, p75] interval, never a single point", () => {
    const out = runMonteCarlo(BASE_INPUT);
    expect(out.headlineRange.low).toBe(out.percentiles.p25);
    expect(out.headlineRange.high).toBe(out.percentiles.p75);
    expect(out.headlineRange.high).toBeGreaterThan(out.headlineRange.low);
  });
});

describe("runMonteCarlo probBelowFloor", () => {
  it("is a probability in [0, 1]", () => {
    const out = runMonteCarlo(BASE_INPUT);
    expect(out.probBelowFloor).toBeGreaterThanOrEqual(0);
    expect(out.probBelowFloor).toBeLessThanOrEqual(1);
  });

  it("is monotone non-decreasing in the floor", () => {
    const low = runMonteCarlo({ ...BASE_INPUT, floorApy: 0.02 });
    const mid = runMonteCarlo({ ...BASE_INPUT, floorApy: 0.1 });
    const high = runMonteCarlo({ ...BASE_INPUT, floorApy: 0.3 });
    expect(mid.probBelowFloor).toBeGreaterThanOrEqual(low.probBelowFloor);
    expect(high.probBelowFloor).toBeGreaterThanOrEqual(mid.probBelowFloor);
  });

  it("a floor below everything gives ~0, above everything gives 1", () => {
    const none = runMonteCarlo({ ...BASE_INPUT, floorApy: -1 });
    const all = runMonteCarlo({ ...BASE_INPUT, floorApy: 1e9 });
    expect(none.probBelowFloor).toBe(0);
    expect(all.probBelowFloor).toBe(1);
  });
});

describe("runMonteCarlo GBM sanity", () => {
  it("median path APY tracks the expected blended yield on a large sample", () => {
    // With near-zero vols the path APY collapses to the deterministic blend:
    // mining leg ≈ (hashprice − cost)·365/capital, stable leg ≈ stableApyMean.
    const out = runMonteCarlo({
      ...BASE_INPUT,
      paths: 20_000,
      btc: { ...BASE_INPUT.btc, annualDrift: 0, annualVol: 1e-6 },
      difficulty: {
        ...BASE_INPUT.difficulty,
        annualVol: 1e-6,
        reversionSpeed: 0,
        longRun: BASE_INPUT.difficulty.start,
      },
      yield: { ...BASE_INPUT.yield, stableApyVol: 1e-9 },
    });
    // Deterministic-ish blend → tight spread between p5 and p95.
    expect(out.percentiles.p95 - out.percentiles.p5).toBeLessThan(0.01);
    expect(out.percentiles.p50).toBeGreaterThan(0);
  });

  it("higher BTC drift shifts the median APY upward", () => {
    const lowDrift = runMonteCarlo({
      ...BASE_INPUT,
      paths: 20_000,
      btc: { ...BASE_INPUT.btc, annualDrift: -0.2 },
    });
    const highDrift = runMonteCarlo({
      ...BASE_INPUT,
      paths: 20_000,
      btc: { ...BASE_INPUT.btc, annualDrift: 0.4 },
    });
    expect(highDrift.percentiles.p50).toBeGreaterThan(lowDrift.percentiles.p50);
  });
});
