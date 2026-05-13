import "server-only";

import { inngest } from "@/lib/inngest/client";
import {
  runMiningHealth,
  type MiningHealthInput,
} from "@/lib/agents/mining-health";
import type { MiningHealthOutput } from "@/lib/agents/schemas";

/**
 * Stubbed metrics loader. Returns a plausible Mining Health input shape.
 *
 * TODO (next salvo): replace with a real Prisma query against `MiningMetric`
 *   aggregated over the trailing 30 days.
 */
async function loadMiningMetricsStub(): Promise<MiningHealthInput> {
  return {
    hashprice_usd_per_th: 0.085,
    difficulty_change_pct: 3.2,
    margin_pct: 17.5,
    uptime_pct: 98.4,
    period_days: 30,
  };
}

/**
 * Stubbed alert persistence. No-op for this salvo.
 *
 * TODO (next salvo): persist the alert (alert_level, summary, recommendation)
 *   into the DB and emit a notification when alert_level is "red".
 */
async function persistAlertStub(_result: MiningHealthOutput): Promise<void> {
  // Intentional no-op. The future implementation will write a row to a
  // `MiningHealthAlert` table and trigger a notification on red alerts.
}

/**
 * Mining Health Agent — daily cron (08:00 UTC).
 *
 * Pipeline:
 *   1. load-metrics  → pull 30d aggregates (currently stubbed)
 *   2. run-agent     → call Mining Health Agent (Sonnet 4.6) via DI-friendly entry
 *   3. persist       → persist alert + trigger notification on red (currently stubbed)
 */
export const MINING_HEALTH_DAILY_ID = "mining-health-daily" as const;
export const MINING_HEALTH_DAILY_CRON = "0 8 * * *" as const;

export const miningHealthDaily = inngest.createFunction(
  {
    id: MINING_HEALTH_DAILY_ID,
    triggers: [{ cron: MINING_HEALTH_DAILY_CRON }],
  },
  async ({ step }) => {
    const metrics = await step.run("load-metrics", () => loadMiningMetricsStub());
    const result = await step.run("run-agent", () => runMiningHealth(metrics));
    await step.run("persist", () => persistAlertStub(result));
    return { alert_level: result.alert_level };
  },
);
