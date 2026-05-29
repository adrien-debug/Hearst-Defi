// Distribution Policy — translates a coverage ratio into a distribution action.
//
// Governance rule (Investment Policy): a distribution is never "healthy" when
// coverage < 1.0, and is never paid by silent principal erosion. Below 0.8 it
// is suspended outright.
//
// STRICT pure-function contract (#6): no I/O, deterministic, no mutation.

import { getCoverageState, type CoverageState } from "./coverage";
import type { Provenance } from "./vaults";

export type DistributionAction = "normal" | "monitor" | "reduce" | "suspend";

export interface DistributionRecommendation {
  action: DistributionAction;
  /** Fraction of the target distribution that may be paid, 0–1. */
  maxPayout: number;
  reason: string;
  /** LP-facing, plain, no forbidden words. */
  lpExplanation: string;
  /** Provenance badge to render alongside the recommendation. */
  badge: Provenance;
  /** Mirror of the coverage state for consumers that key off it. */
  state: CoverageState;
}

/** Recommendation used when coverage is not computable (pending data). */
const PENDING: DistributionRecommendation = {
  action: "suspend",
  maxPayout: 0,
  reason: "coverage pending — mining cash-flow data incomplete",
  lpExplanation:
    "Distribution is pending: the mining cash-flow figures needed to confirm coverage have not been attested yet. Nothing is paid from principal.",
  badge: "stale",
  state: "invalid",
};

/**
 * Recommends a distribution action from a coverage ratio.
 *
 * - ratio === null (incomputable) → suspend / pending (never invent a payout).
 * - ≥ 1.25 → normal (100%)
 * - 1.0–1.25 → monitor (100%, watched)
 * - 0.8–1.0 → reduce (80%)
 * - < 0.8 → suspend (0%)
 *
 * The 80% reduced cap keeps the payout strictly below mining cash flow so the
 * principal is never drawn down to fund a distribution.
 */
export function recommendDistributionAction(
  ratio: number | null,
): DistributionRecommendation {
  if (ratio === null || !Number.isFinite(ratio) || ratio < 0) {
    return { ...PENDING };
  }

  const state = getCoverageState(ratio);
  const r = ratio.toFixed(2);

  switch (state) {
    case "healthy":
      return {
        action: "normal",
        maxPayout: 1,
        reason: `coverage ${r}× ≥ 1.25 — full distribution within mining cash flow`,
        lpExplanation:
          "Mining cash flow covers the distribution with a buffer; the full scheduled distribution is supported.",
        badge: "attested",
        state,
      };
    case "adequate":
      return {
        action: "monitor",
        maxPayout: 1,
        reason: `coverage ${r}× in [1.0, 1.25) — covered, monitored`,
        lpExplanation:
          "Mining cash flow covers the distribution; the buffer is thin and is being monitored.",
        badge: "attested",
        state,
      };
    case "stressed":
      return {
        action: "reduce",
        maxPayout: 0.8,
        reason: `coverage ${r}× in [0.8, 1.0) — reduce to stay within cash flow`,
        lpExplanation:
          "Mining cash flow is below the full distribution; the distribution is reduced to remain within available cash flow, not drawn from principal.",
        badge: "estimated",
        state,
      };
    case "suspended":
    default:
      return {
        action: "suspend",
        maxPayout: 0,
        reason: `coverage ${r}× < 0.8 — suspend; not paid from principal`,
        lpExplanation:
          "Mining cash flow does not cover the distribution; the distribution is suspended rather than paid from principal.",
        badge: "stale",
        state,
      };
  }
}
