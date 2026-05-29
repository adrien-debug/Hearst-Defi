// Coverage View builder (pure) — P1.
//
// Assembles already-fetched coverage parts into a CoverageView carrying a
// Live / Estimated / Pending / Invalid provenance, the computed coverage, and a
// distribution recommendation. The data loader (server) does the I/O and calls
// this; keeping the decision pure makes every state testable without a DB.
//
// Sits ABOVE coverage.ts + distribution-policy.ts in the import DAG (it imports
// both) — no circular dependency.

import {
  calculateDistributionCoverage,
  isCoverageNumber,
  COVERAGE_MANDATORY_KEYS,
  type CoverageState,
} from "./coverage";
import {
  recommendDistributionAction,
  type DistributionRecommendation,
} from "./distribution-policy";

/** The six mandatory inputs (any undefined → Pending) + optional context. */
export interface CoverageParts {
  hashprice_usd_per_th_day?: number;
  deployed_th?: number;
  uptime_pct?: number;
  energy_cost_usd_per_kwh?: number;
  revenue_share_fraction?: number;
  target_distribution_usdc?: number;
  efficiency_kwh_per_th_day?: number;
  hosting_pool_usd_per_th_day?: number;
  period_days?: number;
  period?: string;
  vault_ref?: string;
  /** True when the mining inputs come from a verified mining_attestation Proof. */
  attested?: boolean;
  /** True when ANY input is a manual/env value (energy / revenue-share override). */
  anyManual?: boolean;
  /** ISO timestamp of the freshest source row used. */
  lastUpdated?: string | null;
}

export type CoverageViewProvenance = "live" | "estimated" | "pending" | "invalid";

export interface CoverageView {
  state: CoverageState;
  provenance: CoverageViewProvenance;
  ratio: number | null;
  netMiningCashUsd: number | null;
  targetDistributionUsdc: number | null;
  recommendation: DistributionRecommendation;
  period: string | null;
  vaultRef: string | null;
  lastUpdated: string | null;
  /** Mandatory inputs that were missing (drives the Pending state). */
  missingInputs: string[];
  summary: string;
  healthy: boolean;
}

/**
 * Pure: builds the full coverage view from fetched parts.
 *
 *   - missing any mandatory input          → "pending"  (never fabricate)
 *   - present but engine-invalid            → "invalid"
 *   - present + attested + no manual input  → "live"
 *   - present + manual/mixed source         → "estimated"
 */
export function buildCoverageView(parts: CoverageParts): CoverageView {
  const period = parts.period ?? null;
  const vaultRef = parts.vault_ref ?? null;
  const lastUpdated = parts.lastUpdated ?? null;

  const missingInputs = COVERAGE_MANDATORY_KEYS.filter(
    (k) => !isCoverageNumber(parts[k]),
  );

  if (missingInputs.length > 0) {
    return {
      state: "invalid",
      provenance: "pending",
      ratio: null,
      netMiningCashUsd: null,
      targetDistributionUsdc: isCoverageNumber(parts.target_distribution_usdc)
        ? parts.target_distribution_usdc
        : null,
      recommendation: recommendDistributionAction(null),
      period,
      vaultRef,
      lastUpdated,
      missingInputs: [...missingInputs],
      summary: "Coverage pending until mining cash-flow inputs are attested.",
      healthy: false,
    };
  }

  const result = calculateDistributionCoverage({
    hashprice_usd_per_th_day: parts.hashprice_usd_per_th_day!,
    deployed_th: parts.deployed_th!,
    uptime_pct: parts.uptime_pct!,
    energy_cost_usd_per_kwh: parts.energy_cost_usd_per_kwh!,
    revenue_share_fraction: parts.revenue_share_fraction!,
    target_distribution_usdc: parts.target_distribution_usdc!,
    efficiency_kwh_per_th_day: parts.efficiency_kwh_per_th_day,
    hosting_pool_usd_per_th_day: parts.hosting_pool_usd_per_th_day,
    period_days: parts.period_days,
    period: parts.period,
    vault_ref: parts.vault_ref,
  });

  if (result.state === "invalid") {
    return {
      state: "invalid",
      provenance: "invalid",
      ratio: null,
      netMiningCashUsd: null,
      targetDistributionUsdc: parts.target_distribution_usdc!,
      recommendation: recommendDistributionAction(null),
      period,
      vaultRef,
      lastUpdated,
      missingInputs: [],
      summary: result.summary,
      healthy: false,
    };
  }

  // Live ONLY when attested AND no manual input; otherwise Estimated.
  const provenance: CoverageViewProvenance =
    parts.attested === true && parts.anyManual !== true ? "live" : "estimated";

  return {
    state: result.state,
    provenance,
    ratio: result.ratio,
    netMiningCashUsd: result.netMiningCashUsd,
    targetDistributionUsdc: parts.target_distribution_usdc!,
    recommendation: recommendDistributionAction(result.ratio),
    period,
    vaultRef,
    lastUpdated,
    missingInputs: [],
    summary: result.summary,
    healthy: result.healthy,
  };
}
