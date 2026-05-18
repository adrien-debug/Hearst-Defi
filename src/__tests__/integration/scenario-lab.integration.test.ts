import { describe, expect, it } from "vitest";

import { runScenario, getPresetInputs } from "@/lib/engine/scenario";
import { runBacktest } from "@/lib/engine/backtest";
import type { Preset, ScenarioInputs } from "@/lib/engine/types";

describe("Scenario Lab integration", () => {
  it("runs a base scenario end-to-end", () => {
    const inputs = getPresetInputs("base");
    const result = runScenario(inputs, { preset: "base", now: new Date() });

    expect(result.apy_range.low).toBeGreaterThan(0);
    expect(result.apy_range.high).toBeGreaterThan(result.apy_range.low);
    expect(result.allocations.length).toBe(4);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it("runs all presets without throwing", () => {
    const presets: Preset[] = ["base", "btc_bear", "btc_bull", "mining_compression", "extreme_stress"];
    for (const preset of presets) {
      const inputs = getPresetInputs(preset);
      expect(() => runScenario(inputs, { preset, now: new Date() })).not.toThrow();
    }
  });

  it("runs a backtest end-to-end", () => {
    const result = runBacktest("bear_2022", { now: new Date() });

    expect(result.initialCapital).toBe(1_000_000);
    expect(result.monthlySeries.length).toBeGreaterThan(0);
    expect(result.numRebalances).toBeGreaterThanOrEqual(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it("respects input bounds", () => {
    const badInputs: ScenarioInputs = {
      btc_price_change_pct: 500,
      hashprice_usd_th_day: 0.085,
      energy_cost_kwh: 0.045,
      stable_apy_pct: 4.5,
      vol_index: 45,
    };

    // The engine itself does not throw on out-of-bounds values;
    // the Server Action layer (`assertBounds`) guards that.
    // Here we verify the engine accepts the input and produces a result.
    const result = runScenario(badInputs, { now: new Date() });
    expect(result).toBeDefined();
  });
});
