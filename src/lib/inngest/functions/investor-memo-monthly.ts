import "server-only";

import { inngest } from "@/lib/inngest/client";
import {
  runInvestorMemo,
  type InvestorMemoInput,
} from "@/lib/agents/investor-memo";
import { runBacktest } from "@/lib/engine/backtest";
import { getPresetInputs, runScenario } from "@/lib/engine/scenario";
import type { BacktestOutput, ScenarioOutput } from "@/lib/engine/types";

/**
 * Stubbed vault state loader.
 *
 * TODO (next salvo): replace with a real Prisma query against `VaultSnapshot`
 *   joined with `Allocation` rows for the latest snapshot.
 */
async function loadVaultStateStub(): Promise<InvestorMemoInput["vault"]> {
  return {
    aumUsdc: 12_500_000,
    apyRange: { low: 9.2, high: 12.8 },
    mode: "balanced",
    riskScore: 38,
  };
}

/**
 * Stubbed scenario loader. Runs the three canonical presets through the pure
 * engine to obtain shape-conformant `ScenarioOutput` values. No DB I/O.
 *
 * TODO (next salvo): pull persisted scenario runs from `ScenarioRun` table.
 */
async function loadScenariosStub(): Promise<ScenarioOutput[]> {
  const now = new Date(0);
  return [
    runScenario(getPresetInputs("base"), { preset: "base", now }),
    runScenario(getPresetInputs("btc_bear"), { preset: "btc_bear", now }),
    runScenario(getPresetInputs("btc_bull"), { preset: "btc_bull", now }),
  ];
}

/**
 * Stubbed backtest loader. Runs the three canonical historical windows
 * through the pure engine. No DB I/O.
 *
 * TODO (next salvo): pull persisted backtest runs from `Backtest` table.
 */
async function loadBacktestsStub(): Promise<BacktestOutput[]> {
  const now = new Date(0);
  return [
    runBacktest("bear_2022", { now }),
    runBacktest("etf_halving_2024", { now }),
    runBacktest("mining_crunch_2024", { now }),
  ];
}

/**
 * Investor Memo Agent — monthly cron (1st of month at 09:00 UTC).
 *
 * Pipeline:
 *   1. load-vault      → snapshot vault state (currently stubbed)
 *   2. load-scenarios  → three canonical scenarios (currently engine-stubbed)
 *   3. load-backtests  → three canonical backtests (currently engine-stubbed)
 *   4. run-agent       → call Investor Memo Agent (Opus 4.7)
 *
 * The agent output is returned for inspection; persistence to a `Report`
 * table will land in the next salvo (see TODO below).
 */
export const INVESTOR_MEMO_MONTHLY_ID = "investor-memo-monthly" as const;
export const INVESTOR_MEMO_MONTHLY_CRON = "0 9 1 * *" as const;

export const investorMemoMonthly = inngest.createFunction(
  {
    id: INVESTOR_MEMO_MONTHLY_ID,
    triggers: [{ cron: INVESTOR_MEMO_MONTHLY_CRON }],
  },
  async ({ step }) => {
    const vault = await step.run("load-vault", () => loadVaultStateStub());
    const scenarios = await step.run("load-scenarios", () => loadScenariosStub());
    const backtests = await step.run("load-backtests", () => loadBacktestsStub());

    const result = await step.run("run-agent", () =>
      runInvestorMemo({
        vault,
        scenarios,
        backtests,
        generatedAt: new Date().toISOString(),
      }),
    );

    // TODO (next salvo): persist `result` to a `Report` row + emit a
    // notification with the rendered PDF URL.
    return result;
  },
);
