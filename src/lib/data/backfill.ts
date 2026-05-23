// Pure derivation of MiningMetric rows from daily market history, plus the
// idempotency filter. No prisma, no server-only, relative imports — so the
// `tsx` backfill script and Vitest can both import it. The actual DB write lives
// in the script (prisma/backfill.ts), mirroring how prisma/seed.ts is wired.

import {
  computeMiningRevenue,
  computeOperationalConfidence,
} from "../engine/mining";
import { deriveHashpriceUsdPerThDay } from "../engine/hashprice-formula";
import { startOfUtcDay, type DailyMarketPoint } from "./history";

// Operating assumptions — kept in lock-step with the hourly cron
// (market-data-hourly.ts) so backfilled history joins the live feed seamlessly.
const ENERGY_COST_KWH = 0.05;
const UPTIME_PCT = 98.5;
const DEPLOYED_HASHRATE_THS = 182_000;
const STABLE_APY_PCT = 3.8;
const VOL_INDEX = 50;

/** Shape accepted by `prisma.miningMetric.createMany`. */
export interface MiningMetricRow {
  takenAt: Date;
  hashprice: number;
  difficulty: number;
  btcPrice: number;
  energyCost: number;
  uptimePct: number;
  deployedHashrate: number;
  miningMarginScore: number;
  hashpriceTrendPct: number;
  operationalConfidence: number;
}

/**
 * Derives one MiningMetric per day from the market history. Hashprice comes from
 * the shared formula; margin/confidence scores from the engine; the hashprice
 * trend and BTC 24h change are computed against the previous day.
 */
export function buildMiningMetricRows(
  points: DailyMarketPoint[],
): MiningMetricRow[] {
  const rows: MiningMetricRow[] = [];
  let prevHashprice: number | null = null;
  let prevBtc: number | null = null;

  for (const p of points) {
    const hashprice = round6(deriveHashpriceUsdPerThDay(p.difficulty, p.btcUsd));
    const btcChangePct =
      prevBtc !== null && prevBtc > 0
        ? ((p.btcUsd - prevBtc) / prevBtc) * 100
        : 0;

    const { margin_score } = computeMiningRevenue({
      btc_price_change_pct: btcChangePct,
      hashprice_usd_th_day: hashprice,
      energy_cost_kwh: ENERGY_COST_KWH,
      stable_apy_pct: STABLE_APY_PCT,
      vol_index: VOL_INDEX,
    });

    const hashpriceTrendPct =
      prevHashprice !== null && prevHashprice !== 0
        ? round2(((hashprice - prevHashprice) / prevHashprice) * 100)
        : 0;

    rows.push({
      takenAt: noonUtc(p.date),
      hashprice,
      difficulty: p.difficulty,
      btcPrice: p.btcUsd,
      energyCost: ENERGY_COST_KWH,
      uptimePct: UPTIME_PCT,
      deployedHashrate: DEPLOYED_HASHRATE_THS,
      miningMarginScore: Math.round(margin_score),
      hashpriceTrendPct,
      operationalConfidence: computeOperationalConfidence(margin_score, btcChangePct),
    });

    prevHashprice = hashprice;
    prevBtc = p.btcUsd;
  }

  return rows;
}

/** Canonical per-day key ("YYYY-MM-DD", UTC) for idempotency. */
export function dayKeyOf(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

/** Keeps only rows whose day is not already represented in the DB. */
export function selectNewRows(
  rows: MiningMetricRow[],
  existingDayKeys: ReadonlySet<string>,
): MiningMetricRow[] {
  return rows.filter((r) => !existingDayKeys.has(dayKeyOf(r.takenAt)));
}

function noonUtc(day: Date): Date {
  return new Date(startOfUtcDay(day).getTime() + 12 * 60 * 60 * 1000);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
