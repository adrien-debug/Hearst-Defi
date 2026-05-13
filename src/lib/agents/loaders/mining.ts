import "server-only";

import { prisma } from "@/lib/db";
import type { MiningHealthInput } from "@/lib/agents/mining-health";

/**
 * Reads the most recent `MiningMetric` row and projects it onto the shape
 * consumed by the Mining Health Agent.
 *
 * Field mapping (schema → agent input):
 *   - hashprice           → hashprice_usd_per_th  (USD per TH per day)
 *   - hashpriceTrendPct   → difficulty_change_pct (signed % over the period)
 *   - miningMarginScore   → margin_pct           (margin score is stored as an integer 0–100;
 *                                                  we use it directly as a percentage proxy because
 *                                                  the engine already normalises margin onto that scale)
 *   - uptimePct           → uptime_pct
 *   - constant 30         → period_days          (we operate on rolling 30-day windows per spec)
 *
 * The mapping is intentionally conservative: we do NOT derive new aggregates
 * here (no I/O inside the engine; this loader sits *next to* the engine in
 * the data-access layer but its job is read-only projection). Aggregation is
 * the seed job's responsibility.
 */
export async function loadLatestMiningMetrics(): Promise<MiningHealthInput> {
  const row = await prisma.miningMetric.findFirst({
    orderBy: { takenAt: "desc" },
  });

  if (!row) {
    throw new Error("No mining metrics in DB. Run pnpm db:seed.");
  }

  // All the columns we read below are non-nullable in `prisma/schema.prisma`,
  // but we re-assert at runtime to surface a clear error if the schema drifts.
  if (row.hashprice === null || row.hashprice === undefined) {
    throw new Error("MiningMetric.hashprice is null — invalid seed data.");
  }
  if (row.hashpriceTrendPct === null || row.hashpriceTrendPct === undefined) {
    throw new Error("MiningMetric.hashpriceTrendPct is null — invalid seed data.");
  }
  if (row.miningMarginScore === null || row.miningMarginScore === undefined) {
    throw new Error("MiningMetric.miningMarginScore is null — invalid seed data.");
  }
  if (row.uptimePct === null || row.uptimePct === undefined) {
    throw new Error("MiningMetric.uptimePct is null — invalid seed data.");
  }

  return {
    hashprice_usd_per_th: row.hashprice,
    difficulty_change_pct: row.hashpriceTrendPct,
    margin_pct: row.miningMarginScore,
    uptime_pct: row.uptimePct,
    period_days: 30,
  };
}
