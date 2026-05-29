import "server-only";

import { prisma } from "@/lib/db";
import {
  recommendDistributionAction,
  type DistributionRecommendation,
} from "@/lib/engine/distribution-policy";

/**
 * Distribution snapshot consumed by the Investor Memo PDF.
 *
 * Mirrors the `Distribution` Prisma model with two refinements:
 *   - `period` is forced to "YYYY-MM" (the DB column allows any string but
 *     the seed and the agent contract both standardise on the calendar form).
 *   - `status` is derived because the schema does not yet expose it (a
 *     `Distribution` row with `txHash` null is treated as "scheduled",
 *     otherwise "paid"; the "pending" branch is reserved for in-flight wires
 *     once the rebalancer learns to emit pending rows).
 */
export interface DistributionSnapshot {
  /** Calendar month, "YYYY-MM" (e.g. "2026-05"). */
  period: string;
  /** Distribution amount in USDC (no decimals — schema is Float). */
  amount_usdc: number;
  /** Wire timestamp. `null` when the distribution is scheduled but not yet paid. */
  paid_at: Date | null;
  /** Lifecycle state. Derived from the row, not stored verbatim. */
  status: "paid" | "scheduled" | "pending";
  /**
   * True when this snapshot is the synthesised fallback (no Distribution row in
   * the DB) sized at a default % of AUM — NOT a committed or executed payout.
   * Consumers MUST badge it `estimated` and label it indicative (B4).
   */
  synthesized?: boolean;
  /**
   * Coverage-aware distribution recommendation (P0 Coverage Engine). Optional
   * and non-breaking: consumers that don't read it are unaffected. Until the
   * mining-attestation coverage source is wired (P1), the coverage ratio is
   * unknown, so this resolves to the "pending → suspend" recommendation — an
   * honest signal that the amount above is NOT yet coverage-validated, never a
   * fabricated coverage figure.
   */
  coverage?: DistributionRecommendation;
}

/**
 * Coverage recommendation for a (possibly unknown) coverage ratio. No live
 * coverage source exists yet (P1), so callers pass `null` → pending/suspend.
 */
function coverageFor(ratio: number | null): DistributionRecommendation {
  return recommendDistributionAction(ratio);
}

/**
 * Target monthly distribution rate when nothing is on file in the DB.
 * Matches the 0.8%/mo rate used by the investor-memo PDF test fixture
 * (`src/lib/pdf/__tests__/memo-input.fixture.ts`, `monthlySeries(...)`).
 */
const DEFAULT_MONTHLY_RATE = 0.008;

/**
 * Returns the most recent distribution row, falling back to a synthesised
 * "scheduled" entry for the current calendar month sized at 0.8% of the
 * latest `VaultSnapshot.aumUsdc`. Never throws on empty data.
 */
export async function loadLatestDistribution(): Promise<DistributionSnapshot> {
  const row = await prisma.distribution.findFirst({
    orderBy: { distributedAt: "desc" },
  });

  if (row) {
    return rowToSnapshot({ ...row, amountUsdc: row.amountUsdc.toNumber() });
  }

  // Fallback: synthesise a scheduled distribution for the current month
  // based on the latest vault snapshot AUM. If even the vault is empty we
  // fall further back to a sensible $25M baseline.
  const snapshot = await prisma.vaultSnapshot.findFirst({
    orderBy: { takenAt: "desc" },
    select: { aumUsdc: true },
  });
  // Mode vérité live: never invent capital. With no snapshot the real reserve
  // basis is 0, so the synthesised amount is 0 (an honest "nothing computed"),
  // not a fabricated $25M baseline.
  const aum = snapshot?.aumUsdc?.toNumber() ?? 0;
  return {
    period: periodOf(new Date()),
    amount_usdc: Math.round(aum * DEFAULT_MONTHLY_RATE),
    paid_at: null,
    status: "scheduled",
    synthesized: true,
    coverage: coverageFor(null),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DistributionRow {
  distributedAt: Date;
  amountUsdc: number;
  period: string;
  txHash: string | null;
}

function rowToSnapshot(row: DistributionRow): DistributionSnapshot {
  return {
    period: row.period,
    amount_usdc: row.amountUsdc,
    paid_at: row.distributedAt,
    status: row.txHash ? "paid" : "scheduled",
    // No live coverage source yet (P1) → pending recommendation, not a fake ratio.
    coverage: coverageFor(null),
  };
}

function periodOf(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
