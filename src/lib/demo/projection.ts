// projection.ts — pure function helpers for deposit wizard projection chart.
// Must NOT import src/lib/engine/* directly (CLAUDE.md #6: engine is pure, no
// I/O; but the concern here is that engine functions call Date, etc., which is
// fine inside the engine itself — however the TimeToTargetChart is a Client
// Component and cannot call "server-only" modules). These helpers replicate
// only the arithmetic needed for the time-to-target area chart, keeping the
// engine itself as the single source of truth for full scenarios.
//
// Rule: no I/O, no env reads, no Date.now() here. Inputs are all numeric.

export interface ProjectionPoint {
  month: number;
  nav: number; // e.g. 100 = principal, 112.8 = +12.8%
}

/**
 * Build a simple monthly NAV series for the TimeToTargetChart.
 * Uses a blended monthly return derived from the vault APY midpoint.
 *
 * @param principal   - initial deposit in USDC
 * @param apyLow      - low bound APY (e.g. 9.4)
 * @param apyHigh     - high bound APY (e.g. 12.8)
 * @param months      - projection horizon
 */
export function buildProjectionSeries(
  principal: number,
  apyLow: number,
  apyHigh: number,
  months: number,
): { low: ProjectionPoint[]; mid: ProjectionPoint[]; high: ProjectionPoint[] } {
  const toMonthly = (apy: number) => apy / 100 / 12;
  const midApy = (apyLow + apyHigh) / 2;

  const rates = { low: toMonthly(apyLow), mid: toMonthly(midApy), high: toMonthly(apyHigh) };

  function buildLine(monthlyRate: number): ProjectionPoint[] {
    const pts: ProjectionPoint[] = [{ month: 0, nav: principal }];
    let nav = principal;
    for (let m = 1; m <= months; m++) {
      nav = nav * (1 + monthlyRate);
      pts.push({ month: m, nav: Math.round(nav) });
    }
    return pts;
  }

  return {
    low: buildLine(rates.low),
    mid: buildLine(rates.mid),
    high: buildLine(rates.high),
  };
}

/**
 * Estimate how many months until principal reaches a target cumulative yield %.
 * Returns null if never reached within the horizon.
 */
export function monthsToTarget(
  apyMid: number,
  targetCumulativePct: number,
  maxMonths = 24,
): number | null {
  const monthlyRate = apyMid / 100 / 12;
  let nav = 1;
  for (let m = 1; m <= maxMonths; m++) {
    nav *= 1 + monthlyRate;
    if ((nav - 1) * 100 >= targetCumulativePct) return m;
  }
  return null;
}
