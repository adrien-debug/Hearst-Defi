import { describe, expect, it } from "vitest";
import { decideMode, deriveAllocations } from "../rebalancing";

// Threshold values mirror rebalancing.ts constants:
// DEFENSIVE: riskScore >= 65 OR marginScore < 50
// OPPORTUNISTIC: riskScore <= 40 AND marginScore >= 75
// BALANCED: everything else

describe("decideMode", () => {
  it("returns defensive when risk score is at or above 65", () => {
    expect(decideMode(65, 60)).toBe("defensive");
    expect(decideMode(90, 80)).toBe("defensive");
  });

  it("returns defensive when margin score is below 50", () => {
    expect(decideMode(50, 49)).toBe("defensive");
    expect(decideMode(30, 10)).toBe("defensive");
  });

  it("returns opportunistic when risk <= 40 and margin >= 75", () => {
    expect(decideMode(40, 75)).toBe("opportunistic");
    expect(decideMode(20, 90)).toBe("opportunistic");
  });

  it("returns balanced under normal conditions", () => {
    expect(decideMode(55, 60)).toBe("balanced");
    expect(decideMode(50, 70)).toBe("balanced");
  });

  it("edge: risk exactly at opportunistic ceiling (40) with margin exactly at floor (75) returns opportunistic", () => {
    expect(decideMode(40, 75)).toBe("opportunistic");
  });

  it("edge: risk = 41 with margin = 80 falls to balanced (just above opportunistic risk ceiling)", () => {
    expect(decideMode(41, 80)).toBe("balanced");
  });

  it("edge: margin exactly at defensive threshold (50) with low risk returns balanced (50 is NOT below 50)", () => {
    expect(decideMode(30, 50)).toBe("balanced");
  });

  it("edge: margin = 49 with low risk returns defensive", () => {
    expect(decideMode(30, 49)).toBe("defensive");
  });

  it("edge: risk = 64 does not trigger defensive on risk alone", () => {
    expect(decideMode(64, 60)).toBe("balanced");
  });
});

describe("deriveAllocations", () => {
  const baseInputs = {
    btc_price_change_pct: 0,
    hashprice_usd_th_day: 0.085,
    energy_cost_kwh: 0.045,
    stable_apy_pct: 4.5,
    vol_index: 2,
  };

  it("defensive allocations sum to 100%", () => {
    const allocs = deriveAllocations("defensive", baseInputs, 0.035);
    const total = allocs.reduce((s, a) => s + a.pct, 0);
    expect(total).toBe(100);
  });

  it("balanced allocations sum to 100%", () => {
    const allocs = deriveAllocations("balanced", baseInputs, 0.035);
    const total = allocs.reduce((s, a) => s + a.pct, 0);
    expect(total).toBe(100);
  });

  it("opportunistic allocations sum to 100%", () => {
    const allocs = deriveAllocations("opportunistic", baseInputs, 0.035);
    const total = allocs.reduce((s, a) => s + a.pct, 0);
    expect(total).toBe(100);
  });

  it("defensive gives mining bucket <= 30%", () => {
    const allocs = deriveAllocations("defensive", baseInputs, 0.035);
    const mining = allocs.find((a) => a.bucket === "mining");
    expect(mining?.pct).toBeLessThanOrEqual(30);
  });

  it("opportunistic gives btc_tactical bucket >= 20%", () => {
    const allocs = deriveAllocations("opportunistic", baseInputs, 0.035);
    const btc = allocs.find((a) => a.bucket === "btc_tactical");
    expect(btc?.pct).toBeGreaterThanOrEqual(20);
  });

  it("yield_contribution_bps are non-negative for positive net margin", () => {
    const allocs = deriveAllocations("balanced", baseInputs, 0.04);
    for (const a of allocs) {
      expect(a.yield_contribution_bps).toBeGreaterThanOrEqual(0);
    }
  });
});
