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
  stressedApy: number;
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
  /** `fallback` when the series was synthesised because fewer than 7 DB rows exist. */
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

// Synthetic AUM used in fallback mode — matches the long-running mock.
const FALLBACK_AUM = 24_600_000;
const FALLBACK_APY = { low: 9.4, high: 12.8 } as const;

// Snapshot `source` values that represent the real vault timeline (vs the
// `computed` preset/scenario snapshots used by the memo loader). The dashboard
// reads only these so a stress-preset never leaks into the live KPIs.
const TIMELINE_SOURCES: string[] = ["daily-seed", "live", "oracle", "attested"];

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

  const allocations = buildAllocations(mappedAllocations, vault.aumUsdc, () => {
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

  const timeseries = buildTimeseries(mappedTrailing, vault, () => {
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
      aumUsdc: FALLBACK_AUM,
      delta30dUsdc: 1_200_000,
      apyRange: { low: FALLBACK_APY.low, high: FALLBACK_APY.high },
      stressedApy: 5.2,
      riskScore: 42,
      miningMarginScore: 72,
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
  aumUsdc: number,
  markFallback: () => void,
): DashboardAllocation[] {
  if (rows.length === 0) {
    markFallback();
    return [
      { bucket: "mining", pct: 34, valueUsdc: aumUsdc * 0.34, yieldContributionBps: 620 },
      { bucket: "usdc_base", pct: 38, valueUsdc: aumUsdc * 0.38, yieldContributionBps: 480 },
      { bucket: "btc_tactical", pct: 14, valueUsdc: aumUsdc * 0.14, yieldContributionBps: 0 },
      { bucket: "stable_reserve", pct: 14, valueUsdc: aumUsdc * 0.14, yieldContributionBps: 450 },
    ];
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildTimeseries(
  rows: TrailingSnapshotRow[],
  vault: DashboardVault,
  markFallback: () => void,
): DashboardTimeseries {
  if (rows.length < 7) {
    markFallback();
    return { ...synthesiseTimeseries(vault), source: "fallback" };
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

function synthesiseTimeseries(vault: DashboardVault): DashboardTimeseries {
  const endAum = vault.aumUsdc;
  const startAum = Math.max(0, endAum - 4_000_000);
  const today = new Date();
  // Anchor to start of day UTC.
  today.setUTCHours(0, 0, 0, 0);

  const nav30d: NavPoint[] = [];
  const apy30d: ApyPoint[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * MS_PER_DAY);
    const t = (29 - i) / 29; // 0 .. 1
    // Smooth linear growth + tiny deterministic wiggle so the line is not flat.
    const wiggle = Math.sin(t * Math.PI * 3) * (endAum * 0.01);
    const aum = Math.round(startAum + (endAum - startAum) * t + wiggle);

    // APY band oscillates around methodology target (12%) within 9-13.
    const mid = 11 + Math.sin(t * Math.PI * 2.4) * 0.8;
    const apy_low = Math.round((mid - 1.6) * 10) / 10;
    const apy_high = Math.round((mid + 1.2) * 10) / 10;

    const date = toIsoDate(d);
    nav30d.push({ date, aum_usdc: aum });
    apy30d.push({ date, apy_low, apy_high });
  }

  return { nav30d, apy30d, source: "fallback" };
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

