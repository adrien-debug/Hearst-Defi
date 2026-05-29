import { describe, it, expect } from "vitest";
import {
  calculateDistributionCoverage,
  getCoverageState,
  type CoverageInput,
} from "@/lib/engine/coverage";

// Baseline computable input: netMargin = 0.085 − 0.1×0.05 − 0.005 = 0.075 USD/TH/day.
// net cash = 0.075 × 1e6 TH × 0.98 uptime × 0.5 share × 30d = 1,102,500 USD/month.
function base(over: Partial<CoverageInput> = {}): CoverageInput {
  return {
    hashprice_usd_per_th_day: 0.085,
    deployed_th: 1_000_000,
    uptime_pct: 98,
    energy_cost_usd_per_kwh: 0.05,
    revenue_share_fraction: 0.5,
    target_distribution_usdc: 800_000,
    ...over,
  };
}

describe("calculateDistributionCoverage — bands", () => {
  it("healthy: ratio ≥ 1.25", () => {
    const r = calculateDistributionCoverage(base({ target_distribution_usdc: 800_000 }));
    expect(r.state).toBe("healthy");
    expect(r.ratio).toBeGreaterThanOrEqual(1.25);
    expect(r.healthy).toBe(true);
  });

  it("adequate: 1.0 ≤ ratio < 1.25", () => {
    const r = calculateDistributionCoverage(base({ target_distribution_usdc: 1_000_000 }));
    expect(r.state).toBe("adequate");
    expect(r.ratio).toBeGreaterThanOrEqual(1.0);
    expect(r.ratio).toBeLessThan(1.25);
    expect(r.healthy).toBe(true);
  });

  it("stressed: 0.8 ≤ ratio < 1.0 — NOT healthy", () => {
    const r = calculateDistributionCoverage(base({ target_distribution_usdc: 1_250_000 }));
    expect(r.state).toBe("stressed");
    expect(r.ratio).toBeLessThan(1.0);
    expect(r.healthy).toBe(false); // no silent "healthy" below 1.0
  });

  it("suspended: ratio < 0.8 — NOT healthy", () => {
    const r = calculateDistributionCoverage(base({ target_distribution_usdc: 1_600_000 }));
    expect(r.state).toBe("suspended");
    expect(r.ratio).toBeLessThan(0.8);
    expect(r.healthy).toBe(false);
  });
});

describe("calculateDistributionCoverage — degenerate but valid", () => {
  it("zero hashprice → net cash 0, ratio 0, suspended (computed, not invalid)", () => {
    const r = calculateDistributionCoverage(base({ hashprice_usd_per_th_day: 0 }));
    expect(r.state).toBe("suspended");
    expect(r.ratio).toBe(0);
    expect(r.netMiningCashUsd).toBe(0);
    expect(r.healthy).toBe(false);
  });

  it("zero uptime → net cash 0, suspended", () => {
    const r = calculateDistributionCoverage(base({ uptime_pct: 0 }));
    expect(r.state).toBe("suspended");
    expect(r.ratio).toBe(0);
    expect(r.healthy).toBe(false);
  });

  it("margin below cost is clamped to 0 (never negative cash)", () => {
    // hashprice 0.004 < energy(0.005)+hosting(0.005) → negative margin → clamp 0
    const r = calculateDistributionCoverage(base({ hashprice_usd_per_th_day: 0.004 }));
    expect(r.netMiningCashUsd).toBe(0);
    expect(r.state).toBe("suspended");
  });
});

describe("calculateDistributionCoverage — invalid inputs → pending (never fabricate)", () => {
  it("missing mandatory energy → invalid / pending / ratio null", () => {
    const input = base();
    // simulate missing mandatory field
    delete (input as Partial<CoverageInput>).energy_cost_usd_per_kwh;
    const r = calculateDistributionCoverage(input as CoverageInput);
    expect(r.state).toBe("invalid");
    expect(r.provenance).toBe("pending");
    expect(r.ratio).toBeNull();
    expect(r.netMiningCashUsd).toBeNull();
    expect(r.healthy).toBe(false);
  });

  it("negative value rejected → invalid", () => {
    const r = calculateDistributionCoverage(base({ deployed_th: -5 }));
    expect(r.state).toBe("invalid");
    expect(r.healthy).toBe(false);
  });

  it("target distribution of 0 → invalid (no divide)", () => {
    const r = calculateDistributionCoverage(base({ target_distribution_usdc: 0 }));
    expect(r.state).toBe("invalid");
    expect(r.ratio).toBeNull();
  });

  it("out-of-domain uptime (>100) and revenue share (>1) rejected", () => {
    expect(calculateDistributionCoverage(base({ uptime_pct: 120 })).state).toBe("invalid");
    expect(calculateDistributionCoverage(base({ revenue_share_fraction: 1.5 })).state).toBe("invalid");
  });
});

describe("getCoverageState boundaries", () => {
  it("classifies exact thresholds", () => {
    expect(getCoverageState(1.25)).toBe("healthy");
    expect(getCoverageState(1.0)).toBe("adequate");
    expect(getCoverageState(0.8)).toBe("stressed");
    expect(getCoverageState(0.79)).toBe("suspended");
  });
});
