// Coverage demo seed — testable, env-guarded helpers (P1.5).
//
// Lets the team demonstrate an HONEST "Estimated" coverage in dev/staging
// WITHOUT a final mining vendor: it inserts clearly-marked demo MiningMetric +
// Distribution rows. It NEVER produces an attested Proof, so coverage can reach
// Estimated but never Live. No fake Live, no simulated attestation.
//
// The pure helpers here are imported by scripts/seed-coverage-demo.ts (the CLI
// that does the Prisma writes) and by tests.

/** Sentinel stamped on every demo row so it is unmistakable in the DB/UI. */
export const DEMO_MARKER = "DEMO / staging — not attested";

/**
 * Guard: demo seeding is allowed only outside production, or with an explicit
 * override. Pure (params injected) so it is unit-testable.
 */
export function canSeedCoverageDemo(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  allowFlag: string | undefined = process.env.ALLOW_DEMO_COVERAGE_SEED,
): boolean {
  if (nodeEnv !== "production") return true;
  return allowFlag === "true";
}

export interface DemoMiningMetricRow {
  hashprice: number;
  difficulty: number;
  btcPrice: number;
  energyCost: number;
  uptimePct: number;
  deployedHashrate: number;
  miningMarginScore: number;
  hashpriceTrendPct: number;
  operationalConfidence: number;
  alertLevel: string;
  summary: string;
  recommendation: string;
}

export interface DemoDistributionRow {
  distributedAt: Date;
  amountUsdc: number;
  recipientsCount: number;
  period: string;
  vaultRef: string;
  status: string;
}

/**
 * Demo MiningMetric: healthy-but-MANUAL inputs. With a revenue-share env set,
 * the coverage engine resolves these to ~1.38× Estimated (NOT Live: no
 * attestation is created). Marked demo via summary/recommendation.
 */
export function buildDemoMiningMetric(): DemoMiningMetricRow {
  return {
    hashprice: 0.085,
    difficulty: 1.1e14,
    btcPrice: 60_000,
    energyCost: 0.05,
    uptimePct: 98,
    deployedHashrate: 1_000_000,
    miningMarginScore: 88,
    hashpriceTrendPct: 0,
    operationalConfidence: 80,
    alertLevel: "amber",
    summary: DEMO_MARKER,
    recommendation: DEMO_MARKER,
  };
}

/** Demo Distribution target for the current period. Status scheduled, not paid. */
export function buildDemoDistribution(
  now: Date,
  period: string,
  vaultRef: string,
): DemoDistributionRow {
  return {
    distributedAt: now,
    amountUsdc: 800_000, // target → ratio ≈ 1.38 with the demo mining row
    recipientsCount: 0,
    period,
    vaultRef,
    status: "scheduled",
  };
}

/** Current calendar month as YYYY-MM (caller injects `now` for determinism). */
export function periodOf(now: Date): string {
  return now.toISOString().slice(0, 7);
}
