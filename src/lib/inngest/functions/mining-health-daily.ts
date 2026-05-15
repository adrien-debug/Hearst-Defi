import "server-only";

import { inngest } from "@/lib/inngest/client";
import { runMiningHealth } from "@/lib/agents/mining-health";
import { loadLatestMiningMetrics } from "@/lib/agents/loaders/mining";
import { prisma } from "@/lib/db";

/**
 * Mining Health Agent — daily cron (08:00 UTC).
 *
 * Pipeline:
 *   1. load-metrics  → most recent `MiningMetric` row, projected onto the
 *                       agent's input shape (see loaders/mining.ts).
 *   2. run-agent     → call Mining Health Agent (Sonnet 4.6).
 *   3. persist       → write agent output to a new `MiningMetric` row,
 *                       copying the raw metrics from the latest snapshot.
 */
export const MINING_HEALTH_DAILY_ID = "mining-health-daily" as const;
export const MINING_HEALTH_DAILY_CRON = "0 8 * * *" as const;

/**
 * Minimal `step` surface the handler needs. Lets unit tests drive the
 * handler with a no-op shim without depending on Inngest internals.
 */
export interface MiningHealthDailyStep {
  run<T>(name: string, fn: () => T | Promise<T>): Promise<T>;
}

export async function miningHealthDailyHandler({
  step,
}: {
  step: MiningHealthDailyStep;
}): Promise<{ alert_level: "green" | "amber" | "red" }> {
  const metrics = await step.run("load-metrics", () =>
    loadLatestMiningMetrics(),
  );
  const result = await step.run("run-agent", () => runMiningHealth(metrics));

  await step.run("persist", async () => {
    try {
      const latestRow = await prisma.miningMetric.findFirst({
        orderBy: { takenAt: "desc" },
      });

      if (!latestRow) {
        console.error(
          "[mining-health-daily] No MiningMetric row found to copy raw metrics from.",
        );
        return;
      }

      await prisma.miningMetric.create({
        data: {
          hashprice: latestRow.hashprice,
          difficulty: latestRow.difficulty,
          btcPrice: latestRow.btcPrice,
          energyCost: latestRow.energyCost,
          uptimePct: latestRow.uptimePct,
          deployedHashrate: latestRow.deployedHashrate,
          miningMarginScore: latestRow.miningMarginScore,
          hashpriceTrendPct: latestRow.hashpriceTrendPct,
          operationalConfidence: latestRow.operationalConfidence,
          alertLevel: result.alert_level,
          summary: result.summary,
          recommendation: result.recommendation,
        },
      });

      console.info(
        "[mining-health-daily] persisted alert=%s",
        result.alert_level,
      );
    } catch (err) {
      console.error(
        "[mining-health-daily] DB persist failed:",
        err instanceof Error ? err.message : String(err),
      );
    }
  });

  return { alert_level: result.alert_level };
}

export const miningHealthDaily = inngest.createFunction(
  {
    id: MINING_HEALTH_DAILY_ID,
    triggers: [{ cron: MINING_HEALTH_DAILY_CRON }],
  },
  miningHealthDailyHandler,
);
