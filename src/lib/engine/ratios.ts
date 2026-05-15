/**
 * Institutional risk ratios for the Scenario Engine.
 *
 * Pure functions only. All return values are deterministic for the same input.
 * All inputs are decimal form (0.05 = 5%), not percentages.
 *
 * Conventions:
 * - `periodsPerYear` = 12 for monthly series, 252 for daily, 52 for weekly.
 * - Returns vectors are simple period returns r_t = (P_t / P_{t-1}) - 1.
 * - NAV series is the cumulative price/value path (NOT returns).
 */

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

function sampleStdev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let sq = 0;
  for (const x of xs) {
    const d = x - m;
    sq += d * d;
  }
  return Math.sqrt(sq / (xs.length - 1));
}

/**
 * Annualized Sharpe ratio.
 *
 * Converts `riskFreeRate` (annualized) to per-period, subtracts from mean return,
 * divides by sample stdev of returns, then multiplies by sqrt(periodsPerYear).
 *
 * Edge cases: empty/single-element → 0; zero variance → 0 (avoid Infinity).
 */
export function calcSharpe(
  returns: number[],
  riskFreeRate: number,
  periodsPerYear: number,
): number {
  if (returns.length < 2) return 0;
  const rfPerPeriod = riskFreeRate / periodsPerYear;
  const excess = returns.map((r) => r - rfPerPeriod);
  const sd = sampleStdev(excess);
  if (sd === 0) return 0;
  return (mean(excess) / sd) * Math.sqrt(periodsPerYear);
}

/**
 * Annualized Sortino ratio.
 *
 * Uses downside deviation: RMS of min(0, r - targetReturn/periodsPerYear) over the
 * full sample size (standard convention — denominator is N, not count of negatives).
 *
 * Edge cases: empty/single-element → 0; no downside → 0 (avoid Infinity, since with
 * no observed downside the empirical risk is undefined, not infinite reward).
 */
export function calcSortino(
  returns: number[],
  targetReturn: number,
  periodsPerYear: number,
): number {
  if (returns.length < 2) return 0;
  const targetPerPeriod = targetReturn / periodsPerYear;
  let downsideSq = 0;
  for (const r of returns) {
    const d = r - targetPerPeriod;
    if (d < 0) downsideSq += d * d;
  }
  const downsideDev = Math.sqrt(downsideSq / returns.length);
  if (downsideDev === 0) return 0;
  const excessMean = mean(returns) - targetPerPeriod;
  return (excessMean / downsideDev) * Math.sqrt(periodsPerYear);
}

/**
 * Historical Value-at-Risk at a given confidence level.
 *
 * Method: historical simulation — sort returns ascending, take the (1 - confidence)
 * empirical quantile via linear interpolation, return its magnitude as a positive
 * loss number. A VaR of 0.04 at 95% means "5% chance of losing >=4% in one period".
 *
 * Edge cases: empty → 0; gains-only at the quantile → 0 (no loss observed there).
 */
export function calcVaR(returns: number[], confidence: number): number {
  if (returns.length === 0) return 0;
  if (confidence <= 0 || confidence >= 1) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const alpha = 1 - confidence;
  const pos = alpha * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const loVal = sorted[lo] ?? 0;
  const hiVal = sorted[hi] ?? loVal;
  const frac = pos - lo;
  const quantile = loVal + (hiVal - loVal) * frac;
  return quantile < 0 ? -quantile : 0;
}

/**
 * Maximum drawdown of a NAV (cumulative value) series.
 *
 * Returns a positive number in [0, 1] representing the worst peak-to-trough decline.
 * A return of 0.35 means a 35% drawdown.
 *
 * Edge cases: <2 points → 0; series with non-positive peak → 0.
 */
export function calcMaxDrawdown(navSeries: number[]): number {
  if (navSeries.length < 2) return 0;
  let peak = navSeries[0] ?? 0;
  let maxDd = 0;
  for (const nav of navSeries) {
    if (nav > peak) peak = nav;
    if (peak > 0) {
      const dd = (peak - nav) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

/**
 * Calmar ratio = annualized return / |max drawdown|.
 *
 * Annualized return is computed from the geometric mean of the period returns:
 *   (prod(1 + r_t))^(periodsPerYear / N) - 1
 * Falls back to arithmetic-mean annualization if any (1 + r_t) <= 0 (a wipeout).
 *
 * Returns Infinity when there is no drawdown (per contract).
 * Edge cases: empty returns OR empty NAV → 0.
 */
export function calcCalmar(
  returns: number[],
  navSeries: number[],
  periodsPerYear: number,
): number {
  if (returns.length === 0 || navSeries.length === 0) return 0;
  const mdd = calcMaxDrawdown(navSeries);

  let growth = 1;
  let wipeout = false;
  for (const r of returns) {
    const factor = 1 + r;
    if (factor <= 0) {
      wipeout = true;
      break;
    }
    growth *= factor;
  }
  const annReturn = wipeout
    ? mean(returns) * periodsPerYear
    : Math.pow(growth, periodsPerYear / returns.length) - 1;

  if (mdd === 0) return Infinity;
  return annReturn / mdd;
}
