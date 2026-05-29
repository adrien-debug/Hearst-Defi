// Distribution Coverage — the economic core of the Hearst Yield Vault.
//
// Coverage = net mining cash flow ÷ target distribution, over one monthly period.
// This is what GOVERNS the product: a distribution is never "healthy" unless
// mining cash flow covers it (coverage ≥ 1.0), and is never paid by silent
// principal erosion.
//
// STRICT pure-function contract (non-negotiable #6):
//   - no I/O (DB, fetch, fs, network), no process.env, no Date.now(),
//     no Math.random(), no module-level side effects, no argument mutation.
//   - deterministic: same input → same output.
//
// Fallback policy:
//   - optional inputs (efficiency, hosting/pool, period length) fall back to
//     conservative engine defaults — ALLOWED.
//   - a missing or invalid MANDATORY input yields state "invalid" with
//     provenance "pending" and ratio === null. Fabricating a number is
//     FORBIDDEN: we never invent coverage.

import type { Provenance } from "./vaults";

// ---------------------------------------------------------------------------
// Engine defaults (mirror src/lib/engine/mining.ts constants)
// ---------------------------------------------------------------------------

/** Reference fleet efficiency, kWh per TH per day. */
const DEFAULT_EFFICIENCY_KWH_PER_TH_DAY = 0.1;
/** Combined hosting + pool fee, USD per TH per day. */
const DEFAULT_HOSTING_POOL_USD_PER_TH_DAY = 0.005;
/** Default monthly period length in days. */
const DEFAULT_PERIOD_DAYS = 30;

// Band thresholds (fixed by Investment Policy — do not tune silently).
const BAND_HEALTHY = 1.25;
const BAND_ADEQUATE = 1.0;
const BAND_STRESSED = 0.8;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Coverage state. `invalid` is distinct from `suspended`: `suspended` means we
 * computed a real (low) ratio; `invalid` means we could not compute at all
 * (missing/garbage mandatory input) and must surface "pending", never a number.
 */
export type CoverageState =
  | "healthy" // ratio ≥ 1.25
  | "adequate" // 1.0 ≤ ratio < 1.25
  | "stressed" // 0.8 ≤ ratio < 1.0
  | "suspended" // ratio < 0.8
  | "invalid"; // inputs incomputable

export type CoverageProvenance = Provenance | "pending";

export interface CoverageInput {
  /** Mandatory. USD per TH per day (hashprice). */
  hashprice_usd_per_th_day: number;
  /** Mandatory. Deployed hashrate in TH/s. */
  deployed_th: number;
  /** Mandatory. Uptime percentage, 0–100. */
  uptime_pct: number;
  /** Mandatory. Energy cost USD per kWh. */
  energy_cost_usd_per_kwh: number;
  /** Mandatory. Hearst revenue share as a fraction, 0–1. */
  revenue_share_fraction: number;
  /** Mandatory. Target distribution for the period, USDC (the denominator). */
  target_distribution_usdc: number;

  /** Optional. kWh per TH per day. Default 0.1. */
  efficiency_kwh_per_th_day?: number;
  /** Optional. Hosting + pool fee, USD per TH per day. Default 0.005. */
  hosting_pool_usd_per_th_day?: number;
  /** Optional. Period length in days. Default 30. */
  period_days?: number;

  /** Optional metadata. */
  period?: string;
  vault_ref?: string;
  /** Provenance of the INPUT data; the result downgrades to "pending" if invalid. */
  provenance?: Provenance;
}

export interface CoverageResult {
  /** coverage ratio = net mining cash ÷ target distribution. null when invalid. */
  ratio: number | null;
  state: CoverageState;
  /** Net mining cash flow for the period, USD. null when invalid. */
  netMiningCashUsd: number | null;
  period: string | null;
  vaultRef: string | null;
  provenance: CoverageProvenance;
  summary: string;
  /**
   * LP-facing health flag. NEVER silently true: false whenever the ratio is
   * below 1.0 OR the inputs are invalid. Consumers must not present a
   * distribution as healthy when this is false.
   */
  healthy: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** Classify a (valid, non-negative) coverage ratio into a state. */
export function getCoverageState(ratio: number): CoverageState {
  if (ratio >= BAND_HEALTHY) return "healthy";
  if (ratio >= BAND_ADEQUATE) return "adequate";
  if (ratio >= BAND_STRESSED) return "stressed";
  return "suspended";
}

/**
 * Validates the mandatory inputs. Returns a reason string when invalid,
 * or null when the input is computable. Rejects non-finite, negative, and
 * out-of-domain values (uptime 0–100, revenue share 0–1, target > 0).
 */
function validationError(input: CoverageInput): string | null {
  const mandatory: Array<[string, number]> = [
    ["hashprice_usd_per_th_day", input.hashprice_usd_per_th_day],
    ["deployed_th", input.deployed_th],
    ["uptime_pct", input.uptime_pct],
    ["energy_cost_usd_per_kwh", input.energy_cost_usd_per_kwh],
    ["revenue_share_fraction", input.revenue_share_fraction],
    ["target_distribution_usdc", input.target_distribution_usdc],
  ];
  for (const [name, value] of mandatory) {
    if (!isFiniteNumber(value)) return `missing or non-numeric ${name}`;
    if (value < 0) return `negative ${name}`;
  }
  if (input.uptime_pct > 100) return "uptime_pct above 100";
  if (input.revenue_share_fraction > 1) return "revenue_share_fraction above 1";
  if (input.target_distribution_usdc <= 0) {
    return "target_distribution_usdc must be > 0";
  }
  // Optional fields, when supplied, must still be sane.
  for (const [name, value] of [
    ["efficiency_kwh_per_th_day", input.efficiency_kwh_per_th_day],
    ["hosting_pool_usd_per_th_day", input.hosting_pool_usd_per_th_day],
    ["period_days", input.period_days],
  ] as Array<[string, number | undefined]>) {
    if (value !== undefined && (!isFiniteNumber(value) || value < 0)) {
      return `invalid ${name}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API — pure coverage calculation
// ---------------------------------------------------------------------------

/**
 * Computes distribution coverage from mining cash-flow inputs. Pure.
 *
 * Net mining cash (period) =
 *   max(0, hashprice − efficiency×energy − hosting_pool)
 *     × deployed_th × (uptime/100) × revenue_share × period_days
 *
 * coverage = net mining cash ÷ target_distribution_usdc
 *
 * On invalid/missing mandatory input → state "invalid", provenance "pending",
 * ratio null, healthy false (never a fabricated number).
 */
export function calculateDistributionCoverage(
  input: CoverageInput,
): CoverageResult {
  const period = input.period ?? null;
  const vaultRef = input.vault_ref ?? null;

  const invalidReason = validationError(input);
  if (invalidReason !== null) {
    return {
      ratio: null,
      state: "invalid",
      netMiningCashUsd: null,
      period,
      vaultRef,
      provenance: "pending",
      summary: `Coverage pending — ${invalidReason}.`,
      healthy: false,
    };
  }

  const efficiency =
    input.efficiency_kwh_per_th_day ?? DEFAULT_EFFICIENCY_KWH_PER_TH_DAY;
  const hostingPool =
    input.hosting_pool_usd_per_th_day ?? DEFAULT_HOSTING_POOL_USD_PER_TH_DAY;
  const periodDays = input.period_days ?? DEFAULT_PERIOD_DAYS;

  // Per-TH-per-day net margin; clamp at 0 — a negative margin produces zero
  // distributable cash, never negative cash (we never "owe" the distribution).
  const netMarginPerThDay = Math.max(
    0,
    input.hashprice_usd_per_th_day - efficiency * input.energy_cost_usd_per_kwh - hostingPool,
  );

  const netMiningCashUsd =
    netMarginPerThDay *
    input.deployed_th *
    (input.uptime_pct / 100) *
    input.revenue_share_fraction *
    periodDays;

  const ratio = netMiningCashUsd / input.target_distribution_usdc;
  const state = getCoverageState(ratio);
  const healthy = ratio >= BAND_ADEQUATE;

  return {
    ratio,
    state,
    netMiningCashUsd,
    period,
    vaultRef,
    // Coverage is only as trustworthy as its inputs; default to "estimated"
    // unless the caller asserts a stronger provenance (live/attested/oracle).
    provenance: input.provenance ?? "estimated",
    summary: `${ratio.toFixed(2)}× coverage (${state}) — net mining cash $${Math.round(
      netMiningCashUsd,
    ).toLocaleString("en-US")} vs target $${Math.round(
      input.target_distribution_usdc,
    ).toLocaleString("en-US")}.`,
    healthy,
  };
}

/** Mandatory coverage input keys (used by the P1 view builder). */
export const COVERAGE_MANDATORY_KEYS = [
  "hashprice_usd_per_th_day",
  "deployed_th",
  "uptime_pct",
  "energy_cost_usd_per_kwh",
  "revenue_share_fraction",
  "target_distribution_usdc",
] as const;

/** Exported for the P1 view builder (which lives in coverage-view.ts). */
export function isCoverageNumber(n: unknown): n is number {
  return isFiniteNumber(n);
}
