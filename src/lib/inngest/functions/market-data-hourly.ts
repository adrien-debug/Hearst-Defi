import "server-only";

import { inngest } from "@/lib/inngest/client";
import { fetchBtcPrice } from "@/lib/data/btc-price";
import { fetchHashprice } from "@/lib/data/hashprice";
import { computeMiningRevenue } from "@/lib/engine/mining";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isDuplicate, markComplete } from "@/lib/idempotency";

/**
 * Market Data Ingestion — hourly cron.
 *
 * Fetches live BTC price (CoinGecko) and hashprice (mempool.space)
 * and persists them to the `MiningMetric` table. This is the primary
 * feed that keeps the dashboard and mining health agent current.
 *
 * Cron: every hour at minute 0.
 */
const MARKET_DATA_HOURLY_ID = "market-data-hourly" as const;
const MARKET_DATA_HOURLY_CRON = "0 * * * *" as const;

export interface MarketDataHourlyStep {
  run<T>(name: string, fn: () => T | Promise<T>): Promise<T>;
}

async function marketDataHourlyHandler({
  step,
}: {
  step: MarketDataHourlyStep;
}): Promise<
  | { btcUsd: number; hashprice: number; miningMarginScore: number }
  | { skipped: true; reason: string }
> {
  const now = new Date();

  if (await isDuplicate(MARKET_DATA_HOURLY_ID, now)) {
    return { skipped: true, reason: "already_run_this_hour" };
  }

  const btc = await step.run("fetch-btc-price", () => fetchBtcPrice());
  const hp = await step.run("fetch-hashprice", () => fetchHashprice());

  if (btc.usd <= 0 || hp.usd_per_th_day <= 0) {
    logger.warn("[market-data-hourly] upstream data unavailable", {
      btcUsd: btc.usd,
      hashprice: hp.usd_per_th_day,
      btcStale: btc.stale,
      hashpriceStale: hp.stale,
    });
    // We still mark complete so we don't retry indefinitely on upstream outage.
    await markComplete(MARKET_DATA_HOURLY_ID, now);
    return { skipped: true, reason: "upstream_unavailable" };
  }

  const marginScore = await step.run("compute-margin-score", () => {
    const result = computeMiningRevenue({
      btc_price_change_pct: btc.usd_24h_change,
      hashprice_usd_th_day: hp.usd_per_th_day,
      energy_cost_kwh: 0.05, // industry average, no public real-time feed
      stable_apy_pct: 3.8,
      vol_index: 50,
    });
    return result.margin_score;
  });

  await step.run("persist-mining-metric", async () => {
    try {
      // Compute a simple hashprice trend from the previous row.
      const previous = await prisma.miningMetric.findFirst({
        orderBy: { takenAt: "desc" },
        select: { hashprice: true },
      });

      const hashpriceTrendPct = previous?.hashprice
        ? ((hp.usd_per_th_day - previous.hashprice) / previous.hashprice) * 100
        : 0;

      await prisma.miningMetric.create({
        data: {
          hashprice: hp.usd_per_th_day,
          difficulty: hp.difficulty,
          btcPrice: btc.usd,
          energyCost: 0.05, // industry average, no public real-time feed
          uptimePct: 98.5, // placeholder until real uptime feed
          deployedHashrate: 182_000, // TH/s placeholder
          miningMarginScore: marginScore,
          hashpriceTrendPct: Math.round(hashpriceTrendPct * 100) / 100,
          operationalConfidence: computeOperationalConfidence(marginScore, btc.usd_24h_change),
        },
      });

      logger.info("[market-data-hourly] persisted", {
        btcUsd: btc.usd,
        hashprice: hp.usd_per_th_day,
        marginScore,
      });
    } catch (err) {
      logger.error("[market-data-hourly] persist failed", {}, err instanceof Error ? err : new Error(String(err)));
      throw err; // Let Inngest retry
    }
  });

  await markComplete(MARKET_DATA_HOURLY_ID, now);
  return { btcUsd: btc.usd, hashprice: hp.usd_per_th_day, miningMarginScore: marginScore };
}

/**
 * Simple operational confidence heuristic:
 * - margin_score >= 70 → high confidence (80-100)
 * - margin_score 40-70 → moderate (50-80)
 * - margin_score < 40 → low (0-50)
 * - Adjusted by BTC 24h change magnitude (>10% swing reduces confidence)
 */
function computeOperationalConfidence(marginScore: number, btc24hChange: number): number {
  let base = marginScore;
  if (marginScore >= 70) base = 85;
  else if (marginScore >= 40) base = 65;
  else base = 40;

  const volatilityPenalty = Math.min(20, Math.abs(btc24hChange) * 0.5);
  return Math.round(Math.max(0, Math.min(100, base - volatilityPenalty)));
}

export const marketDataHourly = inngest.createFunction(
  {
    id: MARKET_DATA_HOURLY_ID,
    triggers: [{ cron: MARKET_DATA_HOURLY_CRON }],
  },
  marketDataHourlyHandler,
);
