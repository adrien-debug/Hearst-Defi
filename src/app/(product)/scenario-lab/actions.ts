"use server";

import { getPresetInputs, runScenario } from "@/lib/engine/scenario";
import type {
  BacktestKey,
  BacktestOutput,
  Preset,
  ScenarioInputs,
  ScenarioOutput,
} from "@/lib/engine/types";

const BOUNDS: Record<keyof ScenarioInputs, { min: number; max: number }> = {
  btc_price_change_pct: { min: -100, max: 300 },
  hashprice_usd_th_day: { min: 0.01, max: 1000 },
  energy_cost_kwh: { min: 0.01, max: 1 },
  stable_apy_pct: { min: 0, max: 30 },
  vol_index: { min: 0, max: 100 },
};

function assertBounds(inputs: ScenarioInputs): void {
  for (const [key, { min, max }] of Object.entries(BOUNDS) as Array<
    [keyof ScenarioInputs, { min: number; max: number }]
  >) {
    const v = inputs[key];
    if (v < min || v > max) {
      throw new Error(
        `Input out of bounds: ${key}=${v} (allowed ${min}–${max})`,
      );
    }
  }
}

export async function runScenarioAction(
  inputs: ScenarioInputs,
): Promise<ScenarioOutput> {
  assertBounds(inputs);
  return runScenario(inputs, { now: new Date() });
}

export async function getPresetInputsAction(
  preset: Preset,
): Promise<ScenarioInputs> {
  return getPresetInputs(preset);
}

export async function runBacktestAction(
  key: BacktestKey,
): Promise<BacktestOutput> {
  const { runBacktest } = await import("@/lib/engine/backtest");
  return runBacktest(key, { now: new Date() });
}
