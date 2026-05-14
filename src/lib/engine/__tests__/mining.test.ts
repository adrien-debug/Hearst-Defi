import { describe, expect, it } from "vitest";
import { computeMiningRevenue } from "../mining";

describe("computeMiningRevenue", () => {
  it("healthy: high hashprice + low energy yields margin_score > 70", () => {
    const result = computeMiningRevenue({
      btc_price_change_pct: 0,
      hashprice_usd_th_day: 0.12,
      energy_cost_kwh: 0.03,
      stable_apy_pct: 4.5,
      vol_index: 45,
    });
    expect(result.margin_score).toBeGreaterThan(70);
    expect(result.margin_score).toBeGreaterThanOrEqual(1);
    expect(result.margin_score).toBeLessThanOrEqual(100);
  });

  it("stressed: mid hashprice + mid energy yields margin_score in mid range (30–70)", () => {
    // net ≈ 0.051 → score ≈ 63, well inside 30–70
    const result = computeMiningRevenue({
      btc_price_change_pct: -20,
      hashprice_usd_th_day: 0.062,
      energy_cost_kwh: 0.052,
      stable_apy_pct: 4.5,
      vol_index: 45,
    });
    expect(result.margin_score).toBeGreaterThan(30);
    expect(result.margin_score).toBeLessThan(70);
    expect(result.margin_score).toBeGreaterThanOrEqual(1);
    expect(result.margin_score).toBeLessThanOrEqual(100);
  });

  it("extreme: very low hashprice + high energy yields margin_score < 30", () => {
    const result = computeMiningRevenue({
      btc_price_change_pct: -60,
      hashprice_usd_th_day: 0.03,
      energy_cost_kwh: 0.065,
      stable_apy_pct: 4.5,
      vol_index: 85,
    });
    expect(result.margin_score).toBeLessThan(30);
    expect(result.margin_score).toBeGreaterThanOrEqual(1);
    expect(result.margin_score).toBeLessThanOrEqual(100);
  });
});
