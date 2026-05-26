import "server-only";
import { prisma } from "@/lib/db";
import { monthlyReturn } from "./monthly-return";

/**
 * A single monthly return data point derived from VaultSnapshot records.
 */
export interface MonthlyReturn {
  /** ISO period string, e.g. "2026-04" */
  period: string;
  /** Simple return for this period: (navEnd / navStart) - 1 */
  returnDecimal: number;
  /** Ending NAV in USDC for this period */
  navUsdc: number;
}

/**
 * Query result shape — returns array plus metadata for the UI layer.
 */
export interface VaultReturnsResult {
  vaultId: string;
  period: "1m" | "3m" | "6m" | "12m" | "all";
  returns: MonthlyReturn[];
  /**
   * Data quality flag:
   * - "live"     → fresh snapshots, enough data for reliable statistics
   * - "partial"  → fewer periods than requested (vault is young)
   * - "fallback" → no VaultSnapshot rows found, empty result
   */
  source: "live" | "partial" | "fallback";
}

const PERIOD_MONTHS: Record<Exclude<VaultReturnsResult["period"], "all">, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "12m": 12,
};

/**
 * Read `VaultSnapshot` rows for a given vault and compute monthly period returns.
 *
 * Strategy:
 *  1. Fetch all snapshots ordered ascending by `takenAt`.
 *  2. Bucket into calendar months; use the last snapshot in each month as the
 *     end-of-month NAV (most recent snapshot wins within the month).
 *  3. Compute simple returns: r_t = (nav_t / nav_{t-1}) - 1.
 *  4. Trim to the requested `period` (most recent N months).
 *
 * `VaultSnapshot` has no `vaultId` column — the MVP stores a single vault.
 * The `vaultId` parameter is accepted for future multi-vault compatibility
 * (it will be used once the schema adds a `vaultKey` column to `VaultSnapshot`).
 *
 * Pure from the caller's perspective — the Prisma query is the only I/O here,
 * in keeping with the server-only boundary.
 */
export async function getVaultReturns(
  _vaultId: string,
  period: VaultReturnsResult["period"],
): Promise<VaultReturnsResult> {
  const rows = await prisma.vaultSnapshot.findMany({
    select: { takenAt: true, aumUsdc: true },
    orderBy: { takenAt: "asc" },
  });

  if (rows.length === 0) {
    return { vaultId: _vaultId, period, returns: [], source: "fallback" };
  }

  // ── Bucket snapshots into calendar months ───────────────────────────────────
  const monthMap = new Map<string, number>();
  for (const row of rows) {
    const key = toMonthKey(row.takenAt);
    const nav = Number(row.aumUsdc);
    if (!isFinite(nav) || nav <= 0) continue;
    // Keep the latest NAV within the month (last row wins by ascending order).
    monthMap.set(key, nav);
  }

  // Sort month keys ascending.
  const monthKeys = [...monthMap.keys()].sort();

  // ── Compute period returns between consecutive months ──────────────────────
  // Uses the canonical `monthlyReturn(navStart, navEnd, distribution)` formula
  // from `./monthly-return` — see that file for the single source of truth.
  //
  // `VaultSnapshot` rows do not carry a monthly distribution total today, so we
  // pass distribution = 0 (the canonical formula degrades to a pure NAV ratio
  // in that case). When `VaultSnapshot` gains a `distributionUsdc` column, plumb
  // it through here — the formula does not need to change.
  const allReturns: MonthlyReturn[] = [];
  for (let i = 1; i < monthKeys.length; i++) {
    const prevKey = monthKeys[i - 1]!;
    const curKey = monthKeys[i]!;
    const navPrev = monthMap.get(prevKey)!;
    const navCur = monthMap.get(curKey)!;
    allReturns.push({
      period: curKey,
      returnDecimal: monthlyReturn(navPrev, navCur, 0),
      navUsdc: navCur,
    });
  }

  if (allReturns.length === 0) {
    // Only one distinct month available — cannot compute returns yet.
    return { vaultId: _vaultId, period, returns: [], source: "partial" };
  }

  // ── Trim to requested period ─────────────────────────────────────────────────
  let trimmed: MonthlyReturn[];
  if (period === "all") {
    trimmed = allReturns;
  } else {
    const n = PERIOD_MONTHS[period];
    trimmed = allReturns.slice(-n);
  }

  const requested = period === "all" ? allReturns.length : PERIOD_MONTHS[period];
  const source: VaultReturnsResult["source"] =
    trimmed.length >= requested ? "live" : "partial";

  return { vaultId: _vaultId, period, returns: trimmed, source };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM" for a given Date (UTC). */
function toMonthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
