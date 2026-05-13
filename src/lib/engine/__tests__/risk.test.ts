import { describe, expect, it } from "vitest";
import { computeRiskScore } from "../risk";

describe("computeRiskScore", () => {
  it("always returns a value in [1, 100]", () => {
    const cases = [
      { btc_price_change_pct: 0, hashprice_usd_th_day: 0.085, energy_cost_kwh: 0.045, stable_apy_pct: 4.5, vol_index: 2 },
      { btc_price_change_pct: -65, hashprice_usd_th_day: 0.03, energy_cost_kwh: 0.07, stable_apy_pct: 3.0, vol_index: 3 },
      { btc_price_change_pct: 120, hashprice_usd_th_day: 0.15, energy_cost_kwh: 0.02, stable_apy_pct: 8.0, vol_index: 1 },
    ];
    for (const inputs of cases) {
      const score = computeRiskScore(inputs);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("all-green scenario returns score < 40", () => {
    const score = computeRiskScore({
      btc_price_change_pct: 0,
      hashprice_usd_th_day: 0.12,
      energy_cost_kwh: 0.03,
      stable_apy_pct: 6.0,
      vol_index: 1,
    });
    expect(score).toBeLessThan(40);
  });

  it("all-stressed scenario returns score > 60", () => {
    const score = computeRiskScore({
      btc_price_change_pct: -60,
      hashprice_usd_th_day: 0.035,
      energy_cost_kwh: 0.065,
      stable_apy_pct: 2.5,
      vol_index: 3,
    });
    expect(score).toBeGreaterThan(60);
  });

  it("moderate inputs produce score in mid range (30–70)", () => {
    const score = computeRiskScore({
      btc_price_change_pct: -15,
      hashprice_usd_th_day: 0.07,
      energy_cost_kwh: 0.05,
      stable_apy_pct: 4.0,
      vol_index: 2,
    });
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThan(70);
  });
});
