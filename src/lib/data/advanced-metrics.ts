import "server-only";

import {
  calcCalmar,
  calcMaxDrawdown,
  calcSharpe,
  calcSortino,
  calcVaR,
} from "@/lib/engine/ratios";
import {
  loadVaultMonthlyHistory,
  type VaultMonthlyRow,
} from "@/lib/agents/loaders/vault";

// ---------------------------------------------------------------------------
// Advanced (institutional) risk ratios for the dashboard.
//
// All math is delegated to `src/lib/engine/ratios.ts` (pure functions, no I/O).
// This module's only job is to (1) load enough monthly history to derive a
// returns + NAV series, (2) call the engine, (3) return ready-to-render
// numbers to the Server Component.
// ---------------------------------------------------------------------------

/** Window we attempt to load. Engine functions are stable below this too. */
const HISTORY_WINDOW_MONTHS = 24;
/** Minimum number of months before we surface ratios; below this we hide. */
const MIN_MONTHS_FOR_RATIOS = 6;
/** VaR confidence used by the dashboard. */
const VAR_CONFIDENCE = 0.95;
/** Sortino target return — matches Sharpe risk-free for consistency. */
// TODO: source from config/oracle (currently mirrors the risk-free rate).
const SORTINO_TARGET = 0.045;
// TODO: source from config/oracle.
const RISK_FREE_RATE = 0.045;
const PERIODS_PER_YEAR = 12;

export interface AdvancedMetricsData {
  /** True when the underlying series has enough observations to compute ratios. */
  available: boolean;
  /** Number of monthly observations used (0 when unavailable). */
  monthsUsed: number;
  /** Whether the underlying NAV series came from DB rows or synthetic padding. */
  provenance: "estimated";
  sharpe: number;
  sortino: number;
  /** VaR 95% as a positive decimal loss (0.042 = "lost up to 4.2%"). */
  varDecimal: number;
  /** Max drawdown as a positive decimal in [0, 1]. */
  maxDrawdownDecimal: number;
  calmar: number;
  /** Finite when Calmar is computable; null when MDD is zero. */
  calmarFinite: boolean;
}

/**
 * Loads the monthly NAV history and computes the five institutional ratios.
 *
 * Returns shape is fixed so the Server Component can render a stable layout
 * (no layout shift when toggling Advanced on/off).
 */
export async function loadAdvancedMetrics(): Promise<AdvancedMetricsData> {
  const history = await loadVaultMonthlyHistory(HISTORY_WINDOW_MONTHS);

  if (history.length < MIN_MONTHS_FOR_RATIOS) {
    return {
      available: false,
      monthsUsed: history.length,
      provenance: "estimated",
      sharpe: 0,
      sortino: 0,
      varDecimal: 0,
      maxDrawdownDecimal: 0,
      calmar: 0,
      calmarFinite: false,
    };
  }

  const navSeries = history.map((m) => m.nav_usdc);
  const returns = buildReturnsSeries(history);

  const sharpe = calcSharpe(returns, RISK_FREE_RATE, PERIODS_PER_YEAR);
  const sortino = calcSortino(returns, SORTINO_TARGET, PERIODS_PER_YEAR);
  const varDecimal = calcVaR(returns, VAR_CONFIDENCE);
  const maxDrawdownDecimal = calcMaxDrawdown(navSeries);
  const calmar = calcCalmar(returns, navSeries, PERIODS_PER_YEAR);
  const calmarFinite = Number.isFinite(calmar);

  // Heuristic provenance: when the loader padded the head with synthetic
  // months (deterministic series anchored at 9.0–13.0% APY) we mark the
  // metrics as "estimated"; for DS consistency we keep the same provenance
  // label for fully DB-driven series as well.
  const provenance: AdvancedMetricsData["provenance"] = "estimated";

  return {
    available: true,
    monthsUsed: history.length,
    provenance,
    sharpe,
    sortino,
    varDecimal,
    maxDrawdownDecimal,
    calmar: calmarFinite ? calmar : 0,
    calmarFinite,
  };
}

/**
 * Period returns derived from NAV + distributions:
 *   r_t = (nav_t - nav_{t-1} + dist_t) / nav_{t-1}
 * The first row has no anchor — we drop it rather than fabricate a return.
 */
function buildReturnsSeries(history: readonly VaultMonthlyRow[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < history.length; i += 1) {
    const prev = history[i - 1];
    const cur = history[i];
    if (!prev || !cur) continue;
    if (prev.nav_usdc <= 0) continue;
    const r = (cur.nav_usdc - prev.nav_usdc + cur.distribution_usdc) / prev.nav_usdc;
    out.push(r);
  }
  return out;
}

