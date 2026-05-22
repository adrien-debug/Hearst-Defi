// Pure share-class economics. No I/O — terms are passed in (sourced from the
// VaultDeployment row or the canonical presets below), so the same rules cover
// class A, class B, and any future/custom class.
//
// All fee rates are in basis points (bps), matching the schema columns
// (mgmtFeeBps, perfFeeBps, hurdleBps). Management fee and hurdle are *annual*
// rates, pro-rated by day count.

export interface ShareClassTerms {
  shareClass: string;
  minTicketUsdc: number;
  softLockupDays: number;
  /** Annual management fee, bps of AUM. */
  mgmtFeeBps: number;
  /** Performance fee / carry, bps of profit above hurdle. */
  perfFeeBps: number;
  /** Annual hurdle rate, bps of contributed capital, before carry applies. */
  hurdleBps: number;
}

/** Product-defined classes (plan / roadmap.json). A = 1%+10%, B = 0.75%+8%. */
export const SHARE_CLASS_A: ShareClassTerms = {
  shareClass: "A",
  minTicketUsdc: 250_000,
  softLockupDays: 60,
  mgmtFeeBps: 100,
  perfFeeBps: 1_000,
  hurdleBps: 0,
};

export const SHARE_CLASS_B: ShareClassTerms = {
  shareClass: "B",
  minTicketUsdc: 1_000_000,
  softLockupDays: 90,
  mgmtFeeBps: 75,
  perfFeeBps: 800,
  hurdleBps: 0,
};

const DAYS_PER_YEAR = 365;
const BPS = 10_000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Whether a subscription amount clears the class minimum ticket. */
export function meetsMinimum(amountUsdc: number, terms: ShareClassTerms): boolean {
  return amountUsdc >= terms.minTicketUsdc;
}

/** Management fee accrued over `days` on `aumUsdc` (annual rate, pro-rated). */
export function accrueManagementFee(
  aumUsdc: number,
  days: number,
  terms: ShareClassTerms,
): number {
  if (aumUsdc <= 0 || days <= 0) return 0;
  return round2(aumUsdc * (terms.mgmtFeeBps / BPS) * (days / DAYS_PER_YEAR));
}

/**
 * Performance fee (carry) on `grossProfitUsdc` above the period hurdle.
 * Hurdle = contributed × hurdleBps × days/365. Carry applies only to the excess.
 */
export function performanceFee(
  grossProfitUsdc: number,
  contributedUsdc: number,
  days: number,
  terms: ShareClassTerms,
): number {
  if (grossProfitUsdc <= 0) return 0;
  const hurdleUsdc =
    contributedUsdc > 0 && days > 0
      ? contributedUsdc * (terms.hurdleBps / BPS) * (days / DAYS_PER_YEAR)
      : 0;
  const excess = Math.max(0, grossProfitUsdc - hurdleUsdc);
  return round2(excess * (terms.perfFeeBps / BPS));
}

export interface NetYieldBreakdown {
  grossYieldUsdc: number;
  mgmtFeeUsdc: number;
  perfFeeUsdc: number;
  /** grossYield − mgmtFee − perfFee. */
  netDistributableUsdc: number;
}

/**
 * Net distributable yield after fees. Carry is charged on profit net of the
 * management fee (standard waterfall): mgmt first, then carry on the remainder.
 */
export function netDistributableYield(
  grossYieldUsdc: number,
  aumUsdc: number,
  contributedUsdc: number,
  days: number,
  terms: ShareClassTerms,
): NetYieldBreakdown {
  const mgmtFeeUsdc = accrueManagementFee(aumUsdc, days, terms);
  const profitAfterMgmt = grossYieldUsdc - mgmtFeeUsdc;
  const perfFeeUsdc = performanceFee(profitAfterMgmt, contributedUsdc, days, terms);
  return {
    grossYieldUsdc: round2(grossYieldUsdc),
    mgmtFeeUsdc,
    perfFeeUsdc,
    netDistributableUsdc: round2(grossYieldUsdc - mgmtFeeUsdc - perfFeeUsdc),
  };
}

export interface LockupStatus {
  locked: boolean;
  unlockDate: Date;
  daysRemaining: number;
}

/**
 * Soft-lockup status. `now` is required so the engine stays clock-free; the data
 * layer passes the clock.
 */
export function lockupStatus(
  subscribedAt: Date,
  now: Date,
  terms: ShareClassTerms,
): LockupStatus {
  const unlockDate = new Date(
    subscribedAt.getTime() + terms.softLockupDays * 86_400_000,
  );
  const msRemaining = unlockDate.getTime() - now.getTime();
  const daysRemaining = msRemaining > 0 ? Math.ceil(msRemaining / 86_400_000) : 0;
  return { locked: msRemaining > 0, unlockDate, daysRemaining };
}
