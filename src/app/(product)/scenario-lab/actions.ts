"use server";

import { z } from "zod";
import { getPresetInputs, runScenario } from "@/lib/engine/scenario";
import type {
  BacktestKey,
  BacktestOutput,
  Preset,
  ScenarioInputs,
  ScenarioOutput,
} from "@/lib/engine/types";
import { requireAuth } from "@/lib/auth/require-auth";
import { logger } from "@/lib/logger";
import { assertRateLimit } from "@/lib/rate-limit";

const PresetSchema = z.enum([
  "base",
  "btc_bear",
  "btc_bull",
  "mining_compression",
  "extreme_stress",
] as const);

const BacktestKeySchema = z.enum([
  "bear_2022",
  "etf_halving_2024",
  "mining_crunch_2024",
] as const);

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

/**
 * Runs a single scenario through the deterministic engine.
 *
 * Rate limited to 30 calls per minute per user.
 */
export async function runScenarioAction(
  inputs: ScenarioInputs,
): Promise<ScenarioOutput> {
  const { userId } = await requireAuth();
  try {
    await assertRateLimit(`run-scenario:${userId}`, 30, 60_000);
    assertBounds(inputs);
    return runScenario(inputs, { now: new Date() });
  } catch (err) {
    logger.error("runScenarioAction failed", { userId }, err);
    throw err;
  }
}

export async function getPresetInputsAction(
  preset: Preset,
): Promise<ScenarioInputs> {
  const { userId } = await requireAuth();
  try {
    PresetSchema.parse(preset);
    return getPresetInputs(preset);
  } catch (err) {
    logger.error("getPresetInputsAction failed", { userId }, err);
    throw err;
  }
}

export async function runComparisonAction(
  presets: [Preset, Preset],
): Promise<[ScenarioOutput, ScenarioOutput]> {
  const { userId } = await requireAuth();
  try {
    await assertRateLimit(`run-comparison:${userId}`, 15, 60_000);
    PresetSchema.parse(presets[0]);
    PresetSchema.parse(presets[1]);
    const now = new Date();
    const [a, b] = await Promise.all([
      Promise.resolve(runScenario(getPresetInputs(presets[0]), { now, preset: presets[0] })),
      Promise.resolve(runScenario(getPresetInputs(presets[1]), { now, preset: presets[1] })),
    ]);
    return [a, b];
  } catch (err) {
    logger.error("runComparisonAction failed", { userId }, err);
    throw err;
  }
}

export async function runBacktestAction(
  key: BacktestKey,
): Promise<BacktestOutput> {
  const { userId } = await requireAuth();
  try {
    await assertRateLimit(`run-backtest:${userId}`, 10, 60_000);
    BacktestKeySchema.parse(key);
    const { runBacktest } = await import("@/lib/engine/backtest");
    return runBacktest(key, { now: new Date() });
  } catch (err) {
    logger.error("runBacktestAction failed", { userId }, err);
    throw err;
  }
}
