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
import { prisma } from "@/lib/db";
import { runScenarioNarrative } from "@/lib/agents/scenario-narrative";
import type { ScenarioNarrativeOutput } from "@/lib/agents/schemas";

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
 * Runs a single scenario through the deterministic engine + Scenario Narrative
 * agent.
 *
 * Flow:
 *   1. requireAuth() — Privy JWT → userId (throws on failure)
 *   2. assertRateLimit by userId — 10/min (LLM-aware threshold; was 30/min
 *      before the narrative agent was wired in)
 *   3. assertBounds(inputs) — slider bounds (throws on out-of-range)
 *   4. runScenario(inputs) — pure-function engine
 *   5. Persist ScenarioRun (engine output)
 *   6. runScenarioNarrative({ scenario_id, scenario_output }) — Sonnet 4.6
 *      with graceful degradation: if the agent throws (timeout, forbidden-words
 *      filter, schema fail), the run still returns the engine output with
 *      `narrative: null` and the error is logged.
 *   7. Update ScenarioRun with the narrative if produced
 *   8. Return { ...engineOutput, runId, narrative }
 *
 * The Scenario Lab UI MUST tolerate `narrative === null`.
 *
 * Rate limited to 10 calls per minute per user (LLM-aware — was 30/min before
 * the narrative agent was wired in).
 */
export async function runScenarioAction(
  inputs: ScenarioInputs,
  scenarioId: string = "custom",
): Promise<
  ScenarioOutput & {
    runId: string | null;
    narrative: ScenarioNarrativeOutput | null;
  }
> {
  const { userId } = await requireAuth();
  try {
    await assertRateLimit(`run-scenario:${userId}`, 10, 60_000);
    assertBounds(inputs);
    const outputs = runScenario(inputs, { now: new Date() });

    let runId: string | null = null;
    try {
      const run = await prisma.scenarioRun.create({
        data: {
          userId,
          inputs: JSON.stringify(inputs),
          outputs: JSON.stringify(outputs),
          status: "completed",
          confidence: outputs.confidence,
        },
        select: { id: true },
      });
      runId = run.id;
    } catch (persistErr) {
      // Persistence failure must not fail the response.
      logger.warn("runScenarioAction persistence failed", { userId }, persistErr);
    }

    // Narrative agent — graceful degradation on any failure (Anthropic down,
    // forbidden-words filter trip, schema validation fail). Engine result is
    // still returned with `narrative: null`.
    let narrative: ScenarioNarrativeOutput | null = null;
    if (runId !== null) {
      try {
        narrative = await runScenarioNarrative({
          scenario_id: scenarioId,
          scenario_output: outputs,
        });

        // Persist narrative on the same run row. A failure here is non-fatal:
        // narrative was produced, just couldn't be stored.
        try {
          await prisma.scenarioRun.update({
            where: { id: runId },
            data: {
              narrative: narrative.narrative_md,
              riskWarning: narrative.risk_warning,
              confidence: narrative.confidence,
            },
          });
        } catch (updateErr) {
          logger.warn(
            "runScenarioAction narrative persistence failed",
            { userId, runId },
            updateErr,
          );
        }
      } catch (agentErr) {
        logger.error(
          "runScenarioAction narrative agent failed",
          { userId, runId, scenarioId },
          agentErr,
        );
        narrative = null;
      }
    }

    return { ...outputs, runId, narrative };
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
): Promise<BacktestOutput & { runId: string | null }> {
  const { userId } = await requireAuth();
  try {
    await assertRateLimit(`run-backtest:${userId}`, 10, 60_000);
    BacktestKeySchema.parse(key);
    const { runBacktest } = await import("@/lib/engine/backtest");
    const outputs = runBacktest(key, { now: new Date() });

    let runId: string | null = null;
    try {
      const run = await prisma.backtestRun.create({
        data: {
          userId,
          backtestKey: key,
          initialCapital: outputs.initialCapital,
          rulesMode: outputs.hearstRulesMode ? "hearst_rules" : "without_rules",
          endingValue: outputs.endingValue,
          totalReturnPct: outputs.totalReturnPct,
          maxDrawdownPct: outputs.maxDrawdownPct,
          worstMonthPct: outputs.worstMonthPct,
          numRebalances: outputs.numRebalances,
          monthlySeries: JSON.stringify(outputs.monthlySeries),
        },
        select: { id: true },
      });
      runId = run.id;
    } catch (persistErr) {
      // Persistence failure must not fail the response.
      logger.warn("runBacktestAction persistence failed", { userId }, persistErr);
    }

    return { ...outputs, runId };
  } catch (err) {
    logger.error("runBacktestAction failed", { userId }, err);
    throw err;
  }
}
