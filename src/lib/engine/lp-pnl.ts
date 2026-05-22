// Pure per-LP P&L math. No I/O — the data layer (src/lib/data/portfolio.ts)
// feeds it numbers read from Position/InvestorTransaction and renders the result.
//
// Conventions (single-vault MVP, USDC):
//   contributed  = principal deposited
//   realized     = USDC actually distributed/claimed (cash in hand)
//   unrealized   = yield accrued but not yet distributed
//   currentValue = contributed + unrealized
//   totalReturn  = realized + unrealized   (yield earned, paid or not)

export interface LpPnlInputs {
  /** Principal contributed (sum of deposits), USDC. */
  contributedUsdc: number;
  /** Yield already distributed/claimed (realized), USDC. */
  distributedUsdc: number;
  /** Yield accrued but not yet distributed (unrealized), USDC. */
  accruedYieldUsdc: number;
  /** Days the capital has been deployed — enables annualisation. Omit/0 → null. */
  daysHeld?: number;
}

export interface LpPnl {
  contributedUsdc: number;
  /** contributed + unrealized. */
  currentValueUsdc: number;
  /** Cash returned so far. */
  realizedUsdc: number;
  /** Accrued, not yet paid. */
  unrealizedUsdc: number;
  /** realized + unrealized. */
  totalReturnUsdc: number;
  /** totalReturn / contributed × 100. 0 when nothing contributed. */
  netReturnPct: number;
  /** Simple (non-compounded) annualisation; null when daysHeld is absent/0. */
  annualizedReturnPct: number | null;
}

const DAYS_PER_YEAR = 365;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** P&L for a single position (or any pre-summed contributed/realized/unrealized). */
export function computeLpPnl(inputs: LpPnlInputs): LpPnl {
  const contributedUsdc = Math.max(0, inputs.contributedUsdc);
  const realizedUsdc = inputs.distributedUsdc;
  const unrealizedUsdc = inputs.accruedYieldUsdc;
  const totalReturnUsdc = realizedUsdc + unrealizedUsdc;
  const currentValueUsdc = contributedUsdc + unrealizedUsdc;

  const netReturnPct =
    contributedUsdc > 0 ? (totalReturnUsdc / contributedUsdc) * 100 : 0;

  const daysHeld = inputs.daysHeld ?? 0;
  const annualizedReturnPct =
    contributedUsdc > 0 && daysHeld > 0
      ? round2(netReturnPct * (DAYS_PER_YEAR / daysHeld))
      : null;

  return {
    contributedUsdc: round2(contributedUsdc),
    currentValueUsdc: round2(currentValueUsdc),
    realizedUsdc: round2(realizedUsdc),
    unrealizedUsdc: round2(unrealizedUsdc),
    totalReturnUsdc: round2(totalReturnUsdc),
    netReturnPct: round2(netReturnPct),
    annualizedReturnPct,
  };
}

/**
 * Investor-level P&L across positions. Dollar figures sum; the net return is on
 * total contributed. Annualised return is contribution-weighted by daysHeld and
 * is null unless at least one position carries a positive holding period.
 */
export function aggregateLpPnl(positions: readonly LpPnlInputs[]): LpPnl {
  const totals = positions.reduce(
    (acc, p) => {
      const contributed = Math.max(0, p.contributedUsdc);
      acc.contributed += contributed;
      acc.distributed += p.distributedUsdc;
      acc.accrued += p.accruedYieldUsdc;
      if (p.daysHeld && p.daysHeld > 0) {
        acc.weightedDays += contributed * p.daysHeld;
        acc.weightedBase += contributed;
      }
      return acc;
    },
    { contributed: 0, distributed: 0, accrued: 0, weightedDays: 0, weightedBase: 0 },
  );

  const weightedDaysHeld =
    totals.weightedBase > 0 ? totals.weightedDays / totals.weightedBase : 0;

  return computeLpPnl({
    contributedUsdc: totals.contributed,
    distributedUsdc: totals.distributed,
    accruedYieldUsdc: totals.accrued,
    daysHeld: weightedDaysHeld,
  });
}

/**
 * Whole days between `from` and `now` (UTC), floored at 0. `now` is required so
 * the engine stays clock-free/deterministic — the data layer passes the clock.
 */
export function daysHeldSince(from: Date, now: Date): number {
  const ms = now.getTime() - from.getTime();
  return ms > 0 ? Math.floor(ms / 86_400_000) : 0;
}
