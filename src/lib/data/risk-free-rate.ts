import "server-only";

import { env } from "@/lib/env";

// ---------------------------------------------------------------------------
// Risk-free rate loader.
//
// Sourcing strategy (until Ondo + FRED ingestion is wired — see audit
// `docs/audit/coherence-2026-05-26/04-ingestion-vs-methodology.md` P0-03):
//
//   1. If `RISK_FREE_RATE_ANNUAL_DECIMAL` is set in the environment, we use
//      that value and tag the provenance as `manual` (operator-supplied,
//      auditable via env config — NOT live market data).
//   2. Otherwise we fall back to the methodology default (4.5% — Methodology
//      v1.0) and tag the provenance as `manual` as well, to flag that no
//      external source backs the number.
//
// `live` is reserved for a future direct feed (Ondo) and `oracle` for an
// on-chain attested feed (e.g. Chainlink T-bill aggregator). They are kept
// in the type union so downstream UI / provenance badges can pick them up
// without another refactor when ingestion lands.
// ---------------------------------------------------------------------------

/** Annual risk-free rate as a decimal (0.045 = 4.5%). */
export const DEFAULT_RISK_FREE_RATE_ANNUAL_DECIMAL = 0.045;

export type RiskFreeRateProvenance = "manual" | "oracle" | "live";

export interface RiskFreeRate {
  /** Annual risk-free rate as a decimal (e.g. 0.045 = 4.5%). */
  value: number;
  /** Where the number came from. */
  provenance: RiskFreeRateProvenance;
  /** Optional human label for badges / tooltips. */
  source: string;
}

/**
 * Resolves the current risk-free rate.
 *
 * Async by design: a future implementation will fetch from Ondo / FRED with
 * a Redis cache, so callers must already await today to avoid a churn when
 * the live source is wired in.
 */
export async function getRiskFreeRate(): Promise<RiskFreeRate> {
  const raw = env.RISK_FREE_RATE_ANNUAL_DECIMAL;

  if (raw === undefined || raw === null || raw === "") {
    return {
      value: DEFAULT_RISK_FREE_RATE_ANNUAL_DECIMAL,
      provenance: "manual",
      source: "Methodology v1.0 default (4.5%)",
    };
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    // Bad env value — never crash a server render over a misconfigured rate.
    // Fall back to the methodology default and keep the manual badge so the
    // operator can spot the misconfiguration in the UI / logs.
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        `[risk-free-rate] Ignored invalid RISK_FREE_RATE_ANNUAL_DECIMAL=${raw}; ` +
          `expected a decimal in [0, 1]. Falling back to ${DEFAULT_RISK_FREE_RATE_ANNUAL_DECIMAL}.`,
      );
    }
    return {
      value: DEFAULT_RISK_FREE_RATE_ANNUAL_DECIMAL,
      provenance: "manual",
      source: "Methodology v1.0 default (4.5%) — env override invalid",
    };
  }

  return {
    value: parsed,
    provenance: "live",
    source: "RISK_FREE_RATE_ANNUAL_DECIMAL env var",
  };
}
