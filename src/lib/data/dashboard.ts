import "server-only";

import {
  loadLatestMiningMetrics,
  loadMiningOpsSnapshot,
  type MiningOpsSnapshot,
} from "@/lib/agents/loaders/mining";
import {
  loadDistributionHistory,
  loadLatestDistribution,
  type DistributionSnapshot,
} from "@/lib/agents/loaders/distribution";
import { loadVaultMonthlyHistory, type VaultMonthlyRow } from "@/lib/agents/loaders/vault";
import { fetchBtcPrice, type BtcPriceData } from "@/lib/data/btc-price";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Public dashboard contract.
//
// Single shape consumed by `src/app/(product)/dashboard/page.tsx`. Every field
// either comes from Prisma (`source: "db"`) or from a safe, mock-equivalent
// fallback when the DB is empty (`source: "fallback"`). The page-level
// adapter `toDashboardSnapshot` in this file projects this onto the UI
// `DashboardSnapshot` so the existing dashboard components stay untouched.
// ---------------------------------------------------------------------------

export type VaultMode = "defensive" | "balanced" | "opportunistic";

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
  /**
   * `db` when every field above came from real rows; `partial` when at least
   * one fallback fired; `fallback` when no DB data exists yet.
   */
  source: "db" | "partial" | "fallback";
}

// Synthetic AUM used in fallback mode — matches the long-running mock.
const FALLBACK_AUM = 24_600_000;
const FALLBACK_APY = { low: 9.4, high: 12.8 } as const;

/**
 * Loads everything the `/dashboard` page needs in parallel.
 *
 * Never throws on missing data: each section degrades to a fallback that
 * matches the historical mock values so the visual rendering stays stable
 * even when the DB is empty (e.g. fresh `db:push` without `db:seed`).
 */
export async function loadDashboardData(): Promise<DashboardData> {
  const [
    latestSnapshot,
    miningOps,
    latestMiningRow,
    latestDistribution,
    monthlyHistory,
    btcPrice,
    rebalanceRows,
  ] = await Promise.all([
    prisma.vaultSnapshot.findFirst({
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
  ]);

  let usedFallback = false;

  const vault = await buildVault(latestSnapshot, () => {
    usedFallback = true;
  });

  const allocations = buildAllocations(latestSnapshot?.allocations ?? [], vault.aumUsdc, () => {
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
  const prior = await prisma.vaultSnapshot.findFirst({
    where: { takenAt: { lte: thirtyDaysAgo } },
    orderBy: { takenAt: "desc" },
    select: { aumUsdc: true },
  });
  // If there is no snapshot far enough back, fall back to the oldest one we
  // have. The delta becomes ~"AUM growth across the series".
  const oldestFallback = prior
    ? prior
    : await prisma.vaultSnapshot.findFirst({
        orderBy: { takenAt: "asc" },
        select: { aumUsdc: true },
      });

  const delta30dUsdc =
    oldestFallback && oldestFallback.aumUsdc !== snapshot.aumUsdc
      ? Math.round(snapshot.aumUsdc - oldestFallback.aumUsdc)
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
    const m = await loadLatestMiningMetrics();
    // `loadLatestMiningMetrics` returns the agent-shaped input; we need the
    // raw row's `hashpriceTrendPct` + `operationalConfidence`. Pull the row
    // directly to keep the two values aligned with the latest record.
    const row = await prisma.miningMetric.findFirst({
      orderBy: { takenAt: "desc" },
      select: { hashpriceTrendPct: true, operationalConfidence: true },
    });
    if (row === null) {
      // `loadLatestMiningMetrics` would have thrown, but guard for type safety.
      return { hashpriceTrendPct: m.difficulty_change_pct, operationalConfidence: 81 };
    }
    return {
      hashpriceTrendPct: row.hashpriceTrendPct,
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
// UI adapter — projects DashboardData onto the existing mock-shaped types.
// Lives here (not in `src/app/...`) so it's tree-shakeable and reusable.
// ---------------------------------------------------------------------------

export type {
  DistributionSnapshot,
  MiningOpsSnapshot,
  VaultMonthlyRow,
  BtcPriceData,
};

/**
 * Lightweight history slice consumed by `loadDistributionHistory` callers
 * (currently only the investor memo). Re-exported here so dashboard
 * surfaces can pull it through a single barrel.
 */
export const loadDashboardDistributionHistory = loadDistributionHistory;
