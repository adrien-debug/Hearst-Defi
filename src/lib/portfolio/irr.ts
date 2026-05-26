/**
 * IRR (Internal Rate of Return) — pure function. No I/O, no DB, no fetch.
 *
 * XIRR variant: cash flows with explicit dates (ISO 8601 strings or Date objects).
 * Uses Newton–Raphson iteration to find r such that sum(cf_i / (1+r)^t_i) = 0.
 *
 * Conventions:
 *   - Outflows (capital invested) are negative.
 *   - Inflows (distributions received + current NAV) are positive.
 *   - Result is annualised (act/365 day count).
 *
 * The engine stays deterministic: no Date.now(), no Math.random().
 */

export interface CashFlow {
  /** Signed USDC amount. Negative = capital out, positive = proceeds in. */
  amountUsdc: number;
  /** Exact date of the cash flow event. */
  date: Date;
}

/** Maximum Newton iterations before giving up. */
const MAX_ITER = 200;
/** Convergence tolerance (annualised rate). */
const TOLERANCE = 1e-10;
/** Year in days (act/365). */
const DAYS_PER_YEAR = 365;

/**
 * Year fraction between `base` date and `date` (act/365).
 * Negative when `date` is before `base`.
 */
function yearFraction(base: Date, date: Date): number {
  const diffMs = date.getTime() - base.getTime();
  return diffMs / (DAYS_PER_YEAR * 86_400_000);
}

/**
 * NPV of a set of cash flows at rate `r` with `base` as time-zero.
 * f(r) = sum( cf_i / (1+r)^t_i )
 */
function npv(cashFlows: readonly CashFlow[], base: Date, r: number): number {
  return cashFlows.reduce((sum, cf) => {
    const t = yearFraction(base, cf.date);
    const denom = Math.pow(1 + r, t);
    if (denom === 0) return sum;
    return sum + cf.amountUsdc / denom;
  }, 0);
}

/**
 * Derivative of NPV w.r.t. r:
 * f'(r) = sum( -t_i * cf_i / (1+r)^(t_i+1) )
 */
function npvDerivative(
  cashFlows: readonly CashFlow[],
  base: Date,
  r: number,
): number {
  return cashFlows.reduce((sum, cf) => {
    const t = yearFraction(base, cf.date);
    const denom = Math.pow(1 + r, t + 1);
    if (denom === 0) return sum;
    return sum + (-t * cf.amountUsdc) / denom;
  }, 0);
}

/**
 * Compute the XIRR (annualised IRR on irregular cash flows) via Newton–Raphson.
 *
 * Returns `null` when:
 *   - fewer than 2 cash flows provided
 *   - no sign change (impossible to converge on any finite rate)
 *   - the iteration does not converge within MAX_ITER steps
 *
 * @param cashFlows  Signed USDC amounts with dates. Must include at least one
 *                   negative (capital out) and one positive (proceeds in).
 * @param initialGuess  Starting estimate for Newton. Defaults to 0.1 (10%).
 */
export function xirr(
  cashFlows: readonly CashFlow[],
  initialGuess = 0.1,
): number | null {
  if (cashFlows.length < 2) return null;

  // Validate at least one sign change (necessary for finite IRR).
  const hasNeg = cashFlows.some((cf) => cf.amountUsdc < 0);
  const hasPos = cashFlows.some((cf) => cf.amountUsdc > 0);
  if (!hasNeg || !hasPos) return null;

  // Time-zero is the earliest cash flow date.
  const base = cashFlows.reduce(
    (min, cf) => (cf.date < min ? cf.date : min),
    cashFlows[0]!.date,
  );

  let r = initialGuess;

  for (let i = 0; i < MAX_ITER; i++) {
    const f = npv(cashFlows, base, r);
    const fp = npvDerivative(cashFlows, base, r);

    if (fp === 0) return null; // zero derivative — bail out

    const rNext = r - f / fp;

    if (Math.abs(rNext - r) < TOLERANCE) {
      return rNext;
    }

    r = rNext;

    // Guard against divergence to ±Infinity.
    if (!Number.isFinite(r)) return null;
  }

  // Did not converge.
  return null;
}

/**
 * Convenience wrapper: compute annualised IRR for a single LP position.
 *
 * @param params.costBasisUsdc       Total capital invested (positive number).
 * @param params.subscribedAt        Date of the initial deposit.
 * @param params.distributionsUsdc   Array of {amountUsdc, date} for each distribution received.
 * @param params.currentNavUsdc      Present value of the position (terminal CF).
 * @param params.asOf                "Today" — injected for engine purity.
 *
 * Returns `null` when the position is too young (0 days) or has no inflows.
 */
export function irrAnnualized(params: {
  costBasisUsdc: number;
  subscribedAt: Date;
  distributionsUsdc: ReadonlyArray<{ amountUsdc: number; date: Date }>;
  currentNavUsdc: number;
  asOf: Date;
}): number | null {
  const {
    costBasisUsdc,
    subscribedAt,
    distributionsUsdc,
    currentNavUsdc,
    asOf,
  } = params;

  if (costBasisUsdc <= 0) return null;

  const cashFlows: CashFlow[] = [
    // Opening: capital out (negative).
    { amountUsdc: -costBasisUsdc, date: subscribedAt },
    // Intermediate: each distribution received.
    ...distributionsUsdc.map((d) => ({
      amountUsdc: d.amountUsdc,
      date: d.date,
    })),
    // Terminal: current NAV (positive, on `asOf` date).
    { amountUsdc: currentNavUsdc, date: asOf },
  ];

  return xirr(cashFlows);
}
