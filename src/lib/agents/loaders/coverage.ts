import "server-only";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { buildCoverageView, type CoverageView } from "@/lib/engine/coverage-view";

/**
 * Loads the live distribution coverage for a vault + period (P1).
 *
 * Sources (all existing — no migration):
 *   - MiningMetric  → hashprice, energyCost, uptimePct, deployedHashrate (latest row)
 *   - Distribution  → target distribution (amountUsdc for the vault/period)
 *   - env           → MINING_REVENUE_SHARE_BPS (manual bridge; no on-chain feed yet)
 *                     MINING_ENERGY_COST_USD_PER_KWH (optional manual override)
 *   - Proof         → a mining_attestation for the period flags the source attested
 *
 * Provenance the view resolves to:
 *   - missing MiningMetric / target / revenue-share → Pending
 *   - present, attested, no manual input            → Live
 *   - present, manual/mixed (env revenue-share)     → Estimated   (the P1 reality)
 *   - present but values invalid                     → Invalid
 *
 * Never fabricates a number: any missing mandatory input yields Pending.
 */
export async function loadCoverageForVault(
  vaultRef: string,
  period: string,
): Promise<CoverageView> {
  const [metric, distribution, attestation] = await Promise.all([
    prisma.miningMetric.findFirst({ orderBy: { takenAt: "desc" } }),
    prisma.distribution.findFirst({
      where: { period, OR: [{ vaultRef }, { vaultRef: null }] },
      orderBy: { distributedAt: "desc" },
    }),
    prisma.proof.findFirst({
      where: { proofType: "mining_attestation", period },
    }),
  ]);

  // Revenue-share: env-only in P1 (manual) → caps provenance at Estimated until
  // an attested feed supplies it.
  const revenueShareBps = env.MINING_REVENUE_SHARE_BPS;
  const revenueShareFraction =
    revenueShareBps !== undefined ? revenueShareBps / 10_000 : undefined;

  // Energy: prefer the MiningMetric row (data); fall back to env override (manual).
  const energyFromRow = metric ? metric.energyCost.toNumber() : undefined;
  const energyFromEnv = env.MINING_ENERGY_COST_USD_PER_KWH;
  const energy = energyFromRow ?? energyFromEnv;
  const energyIsManual = energyFromRow === undefined && energyFromEnv !== undefined;

  // Manual whenever a non-attested config value (env revenue-share / env energy)
  // feeds the calculation. In P1 revenue-share is always env → anyManual=true.
  const anyManual = revenueShareFraction !== undefined || energyIsManual;

  return buildCoverageView({
    hashprice_usd_per_th_day: metric ? metric.hashprice.toNumber() : undefined,
    deployed_th: metric ? metric.deployedHashrate.toNumber() : undefined,
    uptime_pct: metric ? metric.uptimePct.toNumber() : undefined,
    energy_cost_usd_per_kwh: energy,
    revenue_share_fraction: revenueShareFraction,
    target_distribution_usdc: distribution
      ? distribution.amountUsdc.toNumber()
      : undefined,
    period,
    vault_ref: vaultRef,
    attested: attestation !== null,
    anyManual,
    lastUpdated: metric ? metric.takenAt.toISOString() : null,
  });
}
