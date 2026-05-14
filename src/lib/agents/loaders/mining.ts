import "server-only";

import { prisma } from "@/lib/db";
import type { MiningHealthInput } from "@/lib/agents/mining-health";

/**
 * Operational snapshot of the mining fleet for the Investor Memo PDF.
 *
 * Distinct from `MiningHealthInput` (which projects rolling indicators onto
 * the agent's expected shape). Here we expose human-facing numbers that land
 * verbatim on the PDF page (hashrate badge, uptime KPI, attestations count).
 */
export interface MiningOpsSnapshot {
  /** Hashrate deployed across the operator fleet, expressed in PH/s. */
  hashrate_ph_s: number;
  /** Uptime over the look-back window, 0–100. */
  uptime_pct: number;
  /** Engine-derived margin composite, 0–100. */
  margin_score: number;
  /** Count of `mining_attestation` proofs published over the look-back window. */
  attestations_count: number;
}

/** Default look-back window for the ops snapshot (30 days). */
const OPS_WINDOW_DAYS = 30;

/** Fallback values used when the DB has no MiningMetric / Proof rows yet. */
const OPS_FALLBACK: MiningOpsSnapshot = {
  hashrate_ph_s: 182,
  uptime_pct: 98.4,
  margin_score: 64,
  attestations_count: 1,
};

/** Conversion: schema stores `deployedHashrate` in TH/s; PDF wants PH/s. */
const TH_PER_PH = 1_000;

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

/**
 * Reads the last `OPS_WINDOW_DAYS` of `MiningMetric` rows plus the count of
 * `mining_attestation` proofs in the same window and projects them onto the
 * PDF-friendly `MiningOpsSnapshot` shape.
 *
 * Decisions:
 *   - `hashrate_ph_s`: average of `deployedHashrate` across the window,
 *     converted from TH/s to PH/s. Average (not last) so a spike on the most
 *     recent row does not distort the headline number reported to LPs.
 *   - `uptime_pct`: arithmetic mean of `uptimePct` across the window. The
 *     schema does not expose a binary "up/down" flag — averaging the recorded
 *     percentages is the closest faithful projection.
 *   - `margin_score`: the most recent `miningMarginScore` (engine output is
 *     already a 0–100 composite; averaging would smear regime shifts).
 *   - `attestations_count`: count of `Proof.proofType = "mining_attestation"`
 *     posted on or after the window start.
 *
 * Fallback: if the DB has no rows in the window, returns the canned
 * `OPS_FALLBACK` so the PDF still renders during dev / before seeding. Never
 * throws on empty data — only on Prisma transport errors.
 */
export async function loadMiningOpsSnapshot(
  opts: { periodEnd?: Date } = {},
): Promise<MiningOpsSnapshot> {
  const periodEnd = opts.periodEnd ?? new Date();
  const periodStart = new Date(periodEnd.getTime() - OPS_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [rows, attestationsCount] = await Promise.all([
    prisma.miningMetric.findMany({
      where: { takenAt: { gte: periodStart, lte: periodEnd } },
      orderBy: { takenAt: "desc" },
    }),
    prisma.proof.count({
      where: {
        proofType: "mining_attestation",
        postedAt: { gte: periodStart, lte: periodEnd },
      },
    }),
  ]);

  if (rows.length === 0) {
    return OPS_FALLBACK;
  }

  const avgDeployedTh =
    rows.reduce((sum, r) => sum + r.deployedHashrate, 0) / rows.length;
  const avgUptime = rows.reduce((sum, r) => sum + r.uptimePct, 0) / rows.length;
  const latest = rows[0];
  // rows[0] is non-undefined here because rows.length > 0 (noUncheckedIndexedAccess).
  const marginScore = latest ? latest.miningMarginScore : OPS_FALLBACK.margin_score;

  return {
    hashrate_ph_s: round1(avgDeployedTh / TH_PER_PH),
    uptime_pct: round1(avgUptime),
    margin_score: marginScore,
    attestations_count: attestationsCount,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
