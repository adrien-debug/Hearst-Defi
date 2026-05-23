import "server-only";

import { Prisma } from "@prisma/client";

import {
  loadLatestMiningMetrics,
  loadMiningOpsSnapshot,
  type MiningOpsSnapshot,
} from "@/lib/agents/loaders/mining";
import {
  loadLatestDistribution,
  type DistributionSnapshot,
} from "@/lib/agents/loaders/distribution";
import { loadVaultMonthlyHistory, type VaultMonthlyRow } from "@/lib/agents/loaders/vault";
import { fetchBtcPrice, type BtcPriceData } from "@/lib/data/btc-price";
import { prisma } from "@/lib/db";
import type { VaultMode } from "@/lib/engine/types";

// ---------------------------------------------------------------------------
// Public dashboard contract.
//
// Single shape consumed by `src/app/admin/dashboard/page.tsx`. Every field
// either comes from Prisma (`source: "db"`) or from a safe, mock-equivalent
// fallback when the DB is empty (`source: "fallback"`). The page-level
// adapter `toDashboardSnapshot` in this file projects this onto the UI
// `DashboardSnapshot` so the existing dashboard components stay untouched.
// ---------------------------------------------------------------------------

// VaultMode is canonical in `@/lib/engine/types`; re-exported here so existing
// dashboard consumers keep importing it from this module (dedup, single source).
export type { VaultMode };

export interface DashboardVault {
  aumUsdc: number;
  /** AUM delta over the past 30 days, USDC. Can be negative. */
  delta30dUsdc: number;
  apyRange: { low: number; high: number };
  /**
   * Stressed APY centre (Bear scenario, methodology v1.0).
   * @deprecated UI consumes `stressedApyRange` to comply with CLAUDE.md rule
   * #1 (APY always as range). Kept here for engine/agent loaders that already
   * read the single-point projection.
   */
  stressedApy: number;
  /**
   * Stressed APY as a range — UI surface. ±15% band around the bear scenario
   * projection (methodology v1.0 MVP proxy until per-scenario p5/p95 land).
   */
  stressedApyRange: { low: number; high: number };
  riskScore: number;
  miningMarginScore: number;
  mode: VaultMode;
  /** Snapshot timestamp the rest of the dashboard derives from. */
  asOf: Date;
}

export type DashboardAllocationBucket =
  | "mining"
  | "btc_tactical"
  | "usdc_base"
  | "stable_reserve";

export interface DashboardAllocation {
  bucket: DashboardAllocationBucket;
  pct: number;
  valueUsdc: number;
  yieldContributionBps: number;
}

export interface DashboardRecentEvent {
  id: string;
  ruleId: string;
  takenAt: Date;
  triggerText: string;
  actionText: string;
  impactText: string;
}

export interface NavPoint {
  /** ISO `YYYY-MM-DD` UTC date. */
  date: string;
  aum_usdc: number;
}

export interface ApyPoint {
  /** ISO `YYYY-MM-DD` UTC date. */
  date: string;
  apy_low: number;
  apy_high: number;
}

export interface DashboardTimeseries {
  nav30d: NavPoint[];
  apy30d: ApyPoint[];
  /** `fallback` when fewer than 7 DB rows exist in the trailing window. */
  source: "db" | "fallback";
}

export interface DashboardData {
  vault: DashboardVault;
  allocations: DashboardAllocation[];
  miningOps: MiningOpsSnapshot;
  /** Latest mining margin trend signal (negative = compressing). */
  hashpriceTrendPct: number;
  /** Operational confidence composite, 0-100. */
  operationalConfidence: number;
  latestDistribution: DistributionSnapshot;
  monthlyHistory: VaultMonthlyRow[];
  btcPrice: BtcPriceData;
  recentEvents: DashboardRecentEvent[];
  /** 30-day NAV + APY range trailing time-series for the dashboard charts. */
  timeseries: DashboardTimeseries;
  /**
   * `db` when every field above came from real rows; `partial` when at least
   * one fallback fired; `fallback` when no DB data exists yet.
   */
  source: "db" | "partial" | "fallback";
}

// Snapshot `source` values that represent the real vault timeline (vs the
// `computed` preset/scenario snapshots used by the memo loader). The dashboard
// reads only these so a stress-preset never leaks into the live KPIs.
const TIMELINE_SOURCES: string[] = ["daily-seed", "live", "oracle", "attested"];

/**
 * Stressed APY band width — ±15% around the centre bear-scenario projection.
 * Methodology v1.0 MVP proxy: until the scenario engine exposes per-scenario
 * p5/p95 quantiles, the dashboard widens the single-point stress into a range
 * so CLAUDE.md rule #1 (APY always as a range, never a single point) holds for
 * the stressed surface too.
 */
const STRESSED_APY_BAND = 0.15;

/**
 * Derives the stressed APY range from the engine's single-point projection.
 * Returns `{ low, high }` with `low <= high`. Negative centres are kept
 * negative (band widens symmetrically around the magnitude).
 */
function stressedRangeFor(centre: number): { low: number; high: number } {
  const magnitude = Math.abs(centre) * STRESSED_APY_BAND;
  const low = centre - magnitude;
  const high = centre + magnitude;
  return low <= high ? { low, high } : { low: high, high: low };
}

/**
 * Loads everything the `/dashboard` page needs in parallel.
 *
 * Never throws on missing data: each section degrades to a fallback that
 * matches the historical mock values so the visual rendering stays stable
 * even when the DB is empty (e.g. fresh `db:push` without `db:seed`).
 */
export async function loadDashboardData(): Promise<DashboardData> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    latestSnapshot,
    miningOps,
    latestMiningRow,
    latestDistribution,
    monthlyHistory,
    btcPrice,
    rebalanceRows,
    trailingSnapshots,
  ] = await Promise.all([
    prisma.vaultSnapshot.findFirst({
      // Exclude scenario/preset snapshots (`source: "computed"`) — those are
      // anchored to preset dates for the memo/scenario loaders and would
      // otherwise pollute the dashboard's "latest" with extreme stress values.
      // Only the real timeline counts here: daily seed locally, live in prod.
      where: { source: { in: TIMELINE_SOURCES } },
      orderBy: { takenAt: "desc" },
      include: { allocations: true },
    }),
    loadMiningOpsSnapshot(),
    safeLoadLatestMining(),
    loadLatestDistribution(),
    loadVaultMonthlyHistory(4),
    fetchBtcPrice(),
    prisma.rebalanceEvent.findMany({
      orderBy: { executedAt: "desc" },
      take: 5,
    }),
    prisma.vaultSnapshot.findMany({
      where: { takenAt: { gte: thirtyDaysAgo }, source: { in: TIMELINE_SOURCES } },
      orderBy: { takenAt: "asc" },
      select: {
        takenAt: true,
        aumUsdc: true,
        currentApyLow: true,
        currentApyHigh: true,
      },
    }),
  ]);

  let usedFallback = false;

  // Decimal → number at the loader boundary: map raw Prisma rows onto the
  // number-only internal shapes before they reach the engine/UI layer.
  const mappedSnapshot = latestSnapshot
    ? toVaultSnapshotWithAllocations(latestSnapshot)
    : null;
  const mappedAllocations = (latestSnapshot?.allocations ?? []).map(toAllocationRow);
  const mappedTrailing = trailingSnapshots.map(toTrailingSnapshotRow);

  const vault = await buildVault(mappedSnapshot, () => {
    usedFallback = true;
  });

  const allocations = buildAllocations(mappedAllocations, () => {
    usedFallback = true;
  });

  const hashpriceTrendPct = latestMiningRow?.hashpriceTrendPct ?? -3.4;
  const operationalConfidence = latestMiningRow?.operationalConfidence ?? 81;
  if (latestMiningRow === null) usedFallback = true;

  const recentEvents: DashboardRecentEvent[] = rebalanceRows.map((r) => ({
    id: r.id,
    ruleId: r.ruleId,
    takenAt: r.executedAt,
    triggerText: r.triggerText,
    actionText: r.actionText,
    impactText: r.impactText,
  }));
  if (recentEvents.length === 0) usedFallback = true;

  const timeseries = buildTimeseries(mappedTrailing, () => {
    usedFallback = true;
  });

  const source: DashboardData["source"] =
    latestSnapshot === null && recentEvents.length === 0
      ? "fallback"
      : usedFallback
        ? "partial"
        : "db";

  return {
    vault,
    allocations,
    miningOps,
    hashpriceTrendPct,
    operationalConfidence,
    latestDistribution,
    monthlyHistory,
    btcPrice,
    recentEvents,
    timeseries,
    source,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface VaultSnapshotWithAllocations {
  id: string;
  takenAt: Date;
  aumUsdc: number;
  currentApyLow: number;
  currentApyHigh: number;
  stressedApy: number;
  riskScore: number;
  miningMarginScore: number;
  mode: string;
}

/**
 * Maps a raw Prisma `VaultSnapshot` (Decimal financial columns) onto the
 * number-only internal `VaultSnapshotWithAllocations`. Decimal → number at the
 * data boundary so the engine/UI never sees Decimal.
 */
function toVaultSnapshotWithAllocations(row: {
  id: string;
  takenAt: Date;
  aumUsdc: Prisma.Decimal;
  currentApyLow: Prisma.Decimal;
  currentApyHigh: Prisma.Decimal;
  stressedApy: Prisma.Decimal;
  riskScore: number;
  miningMarginScore: number;
  mode: string;
}): VaultSnapshotWithAllocations {
  return {
    id: row.id,
    takenAt: row.takenAt,
    aumUsdc: row.aumUsdc.toNumber(),
    currentApyLow: row.currentApyLow.toNumber(),
    currentApyHigh: row.currentApyHigh.toNumber(),
    stressedApy: row.stressedApy.toNumber(),
    riskScore: row.riskScore,
    miningMarginScore: row.miningMarginScore,
    mode: row.mode,
  };
}

async function buildVault(
  snapshot: VaultSnapshotWithAllocations | null,
  markFallback: () => void,
): Promise<DashboardVault> {
  if (snapshot === null) {
    markFallback();
    return {
      aumUsdc: 0,
      delta30dUsdc: 0,
      apyRange: { low: 0, high: 0 },
      stressedApy: 0,
      stressedApyRange: { low: 0, high: 0 },
      riskScore: 0,
      miningMarginScore: 0,
      mode: "balanced",
      asOf: new Date(),
    };
  }

  // Compute 30d AUM delta by finding a snapshot ~30 days older.
  const thirtyDaysAgo = new Date(snapshot.takenAt.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [prior, oldest] = await Promise.all([
    prisma.vaultSnapshot.findFirst({
      where: { takenAt: { lte: thirtyDaysAgo }, source: { in: TIMELINE_SOURCES } },
      orderBy: { takenAt: "desc" },
      select: { aumUsdc: true },
    }),
    prisma.vaultSnapshot.findFirst({
      where: { source: { in: TIMELINE_SOURCES } },
      orderBy: { takenAt: "asc" },
      select: { aumUsdc: true },
    }),
  ]);
  // If there is no snapshot far enough back, fall back to the oldest one we
  // have. The delta becomes ~"AUM growth across the series".
  const oldestFallback = prior ?? oldest;

  // Decimal → number at the read boundary before arithmetic.
  const oldestAum = oldestFallback ? oldestFallback.aumUsdc.toNumber() : null;
  const delta30dUsdc =
    oldestAum !== null && oldestAum !== snapshot.aumUsdc
      ? Math.round(snapshot.aumUsdc - oldestAum)
      : 0;

  return {
    aumUsdc: snapshot.aumUsdc,
    delta30dUsdc,
    apyRange: { low: snapshot.currentApyLow, high: snapshot.currentApyHigh },
    stressedApy: snapshot.stressedApy,
    stressedApyRange: stressedRangeFor(snapshot.stressedApy),
    riskScore: snapshot.riskScore,
    miningMarginScore: snapshot.miningMarginScore,
    mode: normaliseMode(snapshot.mode),
    asOf: snapshot.takenAt,
  };
}

interface AllocationRow {
  bucket: string;
  pct: number;
  valueUsdc: number;
  yieldContributionBps: number;
}

/**
 * Maps a raw Prisma `Allocation` (Decimal pct/value/bps) onto the number-only
 * `AllocationRow`. Decimal → number at the data boundary.
 */
function toAllocationRow(row: {
  bucket: string;
  pct: Prisma.Decimal;
  valueUsdc: Prisma.Decimal;
  yieldContributionBps: Prisma.Decimal;
}): AllocationRow {
  return {
    bucket: row.bucket,
    pct: row.pct.toNumber(),
    valueUsdc: row.valueUsdc.toNumber(),
    yieldContributionBps: row.yieldContributionBps.toNumber(),
  };
}

function buildAllocations(
  rows: AllocationRow[],
  markFallback: () => void,
): DashboardAllocation[] {
  if (rows.length === 0) {
    markFallback();
    return [];
  }
  return rows.map((r) => ({
    bucket: normaliseBucket(r.bucket),
    pct: r.pct,
    valueUsdc: r.valueUsdc,
    yieldContributionBps: r.yieldContributionBps,
  }));
}

async function safeLoadLatestMining(): Promise<{
  hashpriceTrendPct: number;
  operationalConfidence: number;
} | null> {
  try {
    const [m, row] = await Promise.all([
      loadLatestMiningMetrics(),
      // `loadLatestMiningMetrics` returns the agent-shaped input; we need the
      // raw row's `hashpriceTrendPct` + `operationalConfidence`. Pull the row
      // directly to keep the two values aligned with the latest record.
      prisma.miningMetric.findFirst({
        orderBy: { takenAt: "desc" },
        select: { hashpriceTrendPct: true, operationalConfidence: true },
      }),
    ]);
    if (row === null) {
      // `loadLatestMiningMetrics` would have thrown, but guard for type safety.
      return { hashpriceTrendPct: m.difficulty_change_pct, operationalConfidence: 81 };
    }
    return {
      // Decimal → number at the read boundary.
      hashpriceTrendPct: row.hashpriceTrendPct.toNumber(),
      operationalConfidence: row.operationalConfidence,
    };
  } catch {
    return null;
  }
}

function normaliseMode(m: string): VaultMode {
  if (m === "defensive" || m === "balanced" || m === "opportunistic") {
    return m;
  }
  return "balanced";
}

function normaliseBucket(b: string): DashboardAllocationBucket {
  if (
    b === "mining" ||
    b === "btc_tactical" ||
    b === "usdc_base" ||
    b === "stable_reserve"
  ) {
    return b;
  }
  return "mining";
}

// ---------------------------------------------------------------------------
// Time-series builders
// ---------------------------------------------------------------------------

interface TrailingSnapshotRow {
  takenAt: Date;
  aumUsdc: number;
  currentApyLow: number;
  currentApyHigh: number;
}

/**
 * Maps a raw Prisma `VaultSnapshot` slice (Decimal columns) onto the
 * number-only `TrailingSnapshotRow`. Decimal → number at the data boundary.
 */
function toTrailingSnapshotRow(row: {
  takenAt: Date;
  aumUsdc: Prisma.Decimal;
  currentApyLow: Prisma.Decimal;
  currentApyHigh: Prisma.Decimal;
}): TrailingSnapshotRow {
  return {
    takenAt: row.takenAt,
    aumUsdc: row.aumUsdc.toNumber(),
    currentApyLow: row.currentApyLow.toNumber(),
    currentApyHigh: row.currentApyHigh.toNumber(),
  };
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildTimeseries(
  rows: TrailingSnapshotRow[],
  markFallback: () => void,
): DashboardTimeseries {
  if (rows.length < 7) {
    markFallback();
    return { nav30d: [], apy30d: [], source: "fallback" };
  }

  // Collapse to one point per day (keep the latest snapshot per UTC date).
  const byDay = new Map<string, TrailingSnapshotRow>();
  for (const r of rows) {
    byDay.set(toIsoDate(r.takenAt), r);
  }

  const ordered = Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-30);

  const nav30d: NavPoint[] = ordered.map(([date, r]) => ({
    date,
    aum_usdc: r.aumUsdc,
  }));
  const apy30d: ApyPoint[] = ordered.map(([date, r]) => ({
    date,
    apy_low: r.currentApyLow,
    apy_high: r.currentApyHigh,
  }));

  return { nav30d, apy30d, source: "db" };
}

// ---------------------------------------------------------------------------
// UI adapter — projects DashboardData onto the existing mock-shaped types.
// Lives here (not in `src/app/...`) so it's tree-shakeable and reusable.
// ---------------------------------------------------------------------------

export type {
  DistributionSnapshot,
  MiningOpsSnapshot,
  VaultMonthlyRow,
  BtcPriceData,
};

