import "server-only";

import { prisma } from "@/lib/db";
import { getInvestor } from "@/lib/auth/session";
import {
  aggregateLpPnl,
  computeLpPnl,
  daysHeldSince,
  type LpPnl,
} from "@/lib/engine/lp-pnl";
import {
  SHARE_CLASS_A,
  SHARE_CLASS_B,
  type ShareClassTerms,
} from "@/lib/engine/share-class";
import { getTaxPreview, type TaxPreview } from "@/lib/portfolio/tax";
import type { LockMeterProps } from "@/components/portfolio/lock-meter";
import type { RiskPulseProps } from "@/components/portfolio/risk-pulse";
import type { DistribCalendarProps, DistribEntry } from "@/components/portfolio/distrib-calendar";
import type { ProofPulseProps } from "@/components/portfolio/proof-pulse";
import type { YieldStackProps } from "@/components/portfolio/yield-stack";
import type { TimeToCashProps } from "@/components/portfolio/time-to-cash";

// ---------------------------------------------------------------------------
// PositionDetail — extended view for the /portfolio/[positionId] page
// ---------------------------------------------------------------------------

export interface PositionDetailTransaction {
  id: string;
  type: "deposit" | "claim" | "withdraw" | "distribution";
  amountUsdc: number;
  occurredAt: Date;
  txHash: string | null;
}

export interface PositionDetail {
  id: string;
  vaultName: string;
  vaultTicker: string;
  status: "active" | "matured" | "exited";
  principalUsdc: number;
  accruedYieldUsdc: number;
  distributedUsdc: number;
  realizedApyLow: number;  // pct, e.g. 9.4
  realizedApyHigh: number; // pct, e.g. 12.8
  subscribedAt: Date;
  maturedAt: Date | null;
  txHashOpen: string | null;
  transactions: PositionDetailTransaction[];
  /** Computed P&L for this position. Optional — consumers render when present. */
  pnl?: LpPnl;
  /** "live" = real DB data, "fallback" = demo / unauthenticated */
  source: "live" | "fallback";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PortfolioPosition {
  id: string;
  vaultName: string;
  principalUsdc: number;
  accruedYieldUsdc: number;
  distributedUsdc: number;
  /** principal + accrued */
  valueUsdc: number;
  status: "active" | "matured" | "exited";
  /** bps converted to pct, e.g. 940 → 9.4 */
  apyLow: number;
  apyHigh: number;
  subscribedAt: Date;
}

export interface PortfolioTransaction {
  id: string;
  type: "deposit" | "claim" | "withdraw" | "distribution";
  amountUsdc: number;
  occurredAt: Date;
  txHash: string | null;
  positionVaultName?: string;
}

export interface PortfolioData {
  positions: PortfolioPosition[];
  totalValueUsdc: number;
  totalYieldYtdUsdc: number;
  nextDistributionAt: Date;
  recentTransactions: PortfolioTransaction[];
  /** Aggregate P&L across positions. Optional — consumers render when present. */
  pnl?: LpPnl;
  /** "live" = real DB data, "fallback" = unauthenticated / empty state */
  source: "live" | "fallback";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Next UTC end-of-month boundary from today. */
function nextEndOfMonth(): Date {
  const now = new Date();
  // Last day of the current UTC month.
  const eom = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 0),
  );
  // If today IS the last day, roll to next month.
  if (now.getUTCDate() === eom.getUTCDate()) {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0, 23, 59, 59, 0),
    );
  }
  return eom;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v);
  // Prisma Decimal
  if (v !== null && typeof v === "object" && "toNumber" in v) {
    return (v as { toNumber(): number }).toNumber();
  }
  return 0;
}

function bpsToApyPct(bps: number): number {
  return Math.round((bps / 100) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Share-class resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the share-class terms for a position.
 *
 * Source of truth: `VaultDeployment.shareClass` (one-letter code, "A" by default).
 * The actual fee / lockup terms come from the engine presets in
 * `src/lib/engine/share-class.ts` (SHARE_CLASS_A, SHARE_CLASS_B) — NEVER from
 * Prisma `@default(200)` (which is a known drift, P0-4 in the LP audit).
 *
 * TODO (schema): once Position carries its own `shareClass` column independent
 * of VaultDeployment, switch this to read from `position.shareClass` directly.
 * Until then we look at `position.vaultDeployment?.shareClass` and fall back
 * to class A.
 */
export function getShareClassForPosition(
  position: {
    vaultDeployment?: { shareClass?: string | null } | null;
  },
): ShareClassTerms {
  const code = position.vaultDeployment?.shareClass?.toUpperCase() ?? "A";
  return code === "B" ? SHARE_CLASS_B : SHARE_CLASS_A;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loadPortfolio(): Promise<PortfolioData> {
  const investor = await getInvestor();

  if (!investor) {
    return {
      positions: [],
      totalValueUsdc: 0,
      totalYieldYtdUsdc: 0,
      nextDistributionAt: nextEndOfMonth(),
      recentTransactions: [],
      source: "fallback",
    };
  }

  // Fetch positions and both transaction queries in parallel — all 3 are independent.
  const ytdStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const [rawPositions, ytdTxs, rawTxs] = await Promise.all([
    prisma.position.findMany({
      where: { investorId: investor.id },
      include: { vaultDeployment: true },
      orderBy: { subscribedAt: "desc" },
      take: 100,
    }),
    prisma.investorTransaction.findMany({
      where: {
        investorId: investor.id,
        type: { in: ["claim", "distribution"] },
        occurredAt: { gte: ytdStart },
      },
      select: { amountUsdc: true },
      take: 100,
    }),
    prisma.investorTransaction.findMany({
      where: { investorId: investor.id },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
  ]);

  const positions: PortfolioPosition[] = rawPositions.map((p) => {
    const principal = toNumber(p.principalUsdc);
    const accrued = toNumber(p.accruedYieldUsdc);
    const distributed = toNumber(p.distributedUsdc);

    // APY from VaultDeployment if linked, else product-level defaults (9.4–12.8%).
    const apyLowBps = p.vaultDeployment?.targetApyLowBps ?? 940;
    const apyHighBps = p.vaultDeployment?.targetApyHighBps ?? 1280;
    const vaultName = p.vaultDeployment?.name ?? "Hearst Yield Vault";

    const status = p.status as "active" | "matured" | "exited";

    return {
      id: p.id,
      vaultName,
      principalUsdc: principal,
      accruedYieldUsdc: accrued,
      distributedUsdc: distributed,
      valueUsdc: principal + accrued,
      status,
      apyLow: bpsToApyPct(apyLowBps),
      apyHigh: bpsToApyPct(apyHighBps),
      subscribedAt: p.subscribedAt,
    };
  });

  const totalValueUsdc = positions.reduce((sum, p) => sum + p.valueUsdc, 0);

  // YTD yield: sum of accrued + distributed (all transaction types) from Jan 1 UTC.
  const totalYieldYtdUsdc =
    ytdTxs.reduce((sum, t) => sum + toNumber(t.amountUsdc), 0) +
    positions.reduce((sum, p) => sum + p.accruedYieldUsdc, 0);

  // Map positionId → vaultName for activity labels.
  const positionVaultMap = new Map(
    rawPositions.map((p) => [
      p.id,
      p.vaultDeployment?.name ?? "Hearst Yield Vault",
    ]),
  );

  const recentTransactions: PortfolioTransaction[] = rawTxs.map((t) => ({
    id: t.id,
    type: t.type as "deposit" | "claim" | "withdraw" | "distribution",
    amountUsdc: toNumber(t.amountUsdc),
    occurredAt: t.occurredAt,
    txHash: t.txHash,
    positionVaultName: t.positionId
      ? (positionVaultMap.get(t.positionId) ?? undefined)
      : undefined,
  }));

  // Aggregate P&L across positions (clock passed in to keep the engine pure).
  const now = new Date();
  const pnl = aggregateLpPnl(
    rawPositions.map((p) => ({
      contributedUsdc: toNumber(p.principalUsdc),
      distributedUsdc: toNumber(p.distributedUsdc),
      accruedYieldUsdc: toNumber(p.accruedYieldUsdc),
      daysHeld: daysHeldSince(p.subscribedAt, now),
    })),
  );

  return {
    positions,
    totalValueUsdc,
    totalYieldYtdUsdc,
    nextDistributionAt: nextEndOfMonth(),
    recentTransactions,
    pnl,
    source: "live",
  };
}

// ---------------------------------------------------------------------------
// Widget props loaders — Section 1/2/3 new widgets
// ---------------------------------------------------------------------------

/**
 * Build LockMeterProps from the first active position.
 * Returns a neutral STALE state when no investor / no active position —
 * the UI shows a stale provenance badge so users know data is not live.
 */
export async function loadLockMeterProps(): Promise<LockMeterProps & { source: "live" | "stale" }> {
  const now = new Date();
  const investor = await getInvestor();
  if (!investor) {
    return {
      lockStart: now,
      softLockupDays: 0,
      earlyExitPenaltyBps: 0,
      asOf: now,
      source: "stale",
    };
  }

  const position = await prisma.position.findFirst({
    where: { investorId: investor.id, status: "active" },
    orderBy: { subscribedAt: "asc" },
  });

  if (!position) {
    return {
      lockStart: now,
      softLockupDays: 0,
      earlyExitPenaltyBps: 0,
      asOf: now,
      source: "stale",
    };
  }

  // softLockupDays + earlyExitPenaltyBps must come from the share class.
  // Until per-share-class fields land on Position/VaultDeployment, leave
  // them at 0 rather than invent class-A defaults that a class-B LP would
  // see incorrectly.
  return {
    lockStart: position.subscribedAt,
    softLockupDays: 0,
    earlyExitPenaltyBps: 0,
    asOf: now,
    source: "live",
  };
}

/**
 * Build RiskPulseProps from risk-framework data.
 * No snapshot in DB → returns zeroed scores with source "stale" so the UI
 * shows STALE provenance badges instead of inventing numbers.
 */
export async function loadRiskPulseProps(): Promise<RiskPulseProps & { source: "live" | "stale" }> {
  const snapshot = await prisma.vaultSnapshot.findFirst({ orderBy: { takenAt: "desc" } });

  if (!snapshot) {
    return {
      scores: [
        { dimension: "market",         score: 0, delta30d: 0 },
        { dimension: "mining",         score: 0, delta30d: 0 },
        { dimension: "liquidity",      score: 0, delta30d: 0 },
        { dimension: "smart_contract", score: 0, delta30d: 0 },
        { dimension: "counterparty",   score: 0, delta30d: 0 },
      ],
      composite: 0,
      compositeLabel: "Low",
      composite30dTrend: "stable",
      source: "stale",
    };
  }

  const composite = snapshot.riskScore ?? 0;
  // Per-dimension scores are not yet stored on VaultSnapshot. Until the
  // schema carries real sub-scores, return zeros instead of inventing them
  // from the composite — a fabricated breakdown is worse than an empty one
  // for an LP-facing risk panel.
  const scores: RiskPulseProps["scores"] = [
    { dimension: "market",         score: 0, delta30d: 0 },
    { dimension: "mining",         score: 0, delta30d: 0 },
    { dimension: "liquidity",      score: 0, delta30d: 0 },
    { dimension: "smart_contract", score: 0, delta30d: 0 },
    { dimension: "counterparty",   score: 0, delta30d: 0 },
  ];

  const compositeLabel: RiskPulseProps["compositeLabel"] =
    composite <= 33 ? "Low"
    : composite <= 50 ? "Low–Moderate"
    : composite <= 66 ? "Moderate"
    : composite <= 80 ? "Elevated"
    : "High";

  return {
    scores,
    composite,
    compositeLabel,
    composite30dTrend: "stable",
    source: "live",
  };
}

/**
 * Build DistribCalendarProps from Distribution table.
 * No distributions in DB → returns empty entries with source "stale".
 */
export async function loadDistribCalendarProps(): Promise<DistribCalendarProps & { source: "live" | "stale" }> {
  const investor = await getInvestor();

  // Default class A cadence — used when no position exists yet.
  const defaultCadence = "monthly, T+5";

  if (!investor) {
    return { entries: [], shareClass: SHARE_CLASS_A.shareClass, cadence: defaultCadence, source: "stale" };
  }

  // Resolve the investor's share class from their first active position so the
  // calendar surfaces the correct series label (a class B LP must not see "A").
  const firstActive = await prisma.position.findFirst({
    where: { investorId: investor.id, status: "active" },
    orderBy: { subscribedAt: "asc" },
    include: { vaultDeployment: true },
  });
  const terms = firstActive
    ? getShareClassForPosition(firstActive)
    : SHARE_CLASS_A;

  const rawDistribs = await prisma.investorTransaction.findMany({
    where: {
      investorId: investor.id,
      type: "distribution",
      occurredAt: {
        gte: new Date(Date.UTC(new Date().getUTCFullYear() - 1, new Date().getUTCMonth(), 1)),
      },
    },
    orderBy: { occurredAt: "asc" },
    take: 12,
  });

  if (rawDistribs.length === 0) {
    return {
      entries: [],
      shareClass: terms.shareClass,
      cadence: defaultCadence,
      source: "stale",
    };
  }

  const entries: DistribEntry[] = rawDistribs.map((tx) => {
    const d = tx.occurredAt;
    const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      period,
      amountUsdc: toNumber(tx.amountUsdc),
      paidAt: tx.occurredAt,
      txHash: tx.txHash ?? undefined,
    };
  });

  return {
    entries,
    shareClass: terms.shareClass,
    cadence: defaultCadence,
    source: "live",
  };
}

/**
 * Build ProofPulseProps from the Proof table (latest PoR).
 * No proof in DB → returns zeroed TVLs with source "stale".
 */
export async function loadProofPulseProps(): Promise<ProofPulseProps & { source: "live" | "stale" }> {
  const now = new Date();
  const latestProof = await prisma.proof.findFirst({
    where: { proofType: "custody" },
    orderBy: { postedAt: "desc" },
  });

  if (!latestProof) {
    return {
      lastPor: { timestamp: now, statedTvlUsdc: 0, onChainTvlUsdc: 0 },
      methodologyVersion: "",
      methodologyLocked: false,
      nextAttestation: null,
      auditor: "",
      source: "stale",
    };
  }

  // Proof model has no TVL columns; we read stated TVL from the latest
  // VaultSnapshot's aumUsdc. On-chain TVL stays 0 until on-chain reads land.
  const snapshot = await prisma.vaultSnapshot.findFirst({
    orderBy: { takenAt: "desc" },
    select: { aumUsdc: true },
  });
  const statedTvlUsdc = snapshot ? toNumber(snapshot.aumUsdc) : 0;

  // methodologyVersion / auditor / nextAttestation should come from the Proof
  // row (or a related table) rather than being baked into the loader. Until the
  // schema carries these fields, surface empty strings + null so the UI never
  // claims a value that isn't actually attested.
  return {
    lastPor: {
      timestamp: latestProof.postedAt,
      statedTvlUsdc,
      onChainTvlUsdc: 0,
    },
    methodologyVersion: "",
    methodologyLocked: false,
    nextAttestation: null,
    auditor: "",
    source: "live",
  };
}

/**
 * Build YieldStackProps from vault allocation data.
 * No snapshot in DB → returns empty sources with source "stale".
 */
export async function loadYieldStackProps(): Promise<YieldStackProps & { source: "live" | "stale" }> {
  const snapshot = await prisma.vaultSnapshot.findFirst({
    orderBy: { takenAt: "desc" },
    include: { allocations: true },
  });

  if (!snapshot || snapshot.allocations.length === 0) {
    return {
      sources: [],
      blendedLow: 0,
      blendedHigh: 0,
      stressedBearRange: { low: 0, high: 0 },
      methodologyVersion: "1.0",
      source: "stale",
    };
  }

  const labelMap: Record<string, string> = {
    mining: "Mining cashflow",
    usdc_base: "USDC base yield",
    btc_tactical: "BTC tactical",
    stable_reserve: "Stable reserve",
  };

  const sources: YieldStackProps["sources"] = snapshot.allocations.map((alloc) => {
    const bucket = alloc.bucket as "mining" | "usdc_base" | "btc_tactical" | "stable_reserve";
    const contributionBps = toNumber(alloc.yieldContributionBps);
    return {
      bucket,
      label: labelMap[bucket] ?? bucket,
      contributionPct: contributionBps / 100,
      isVolatile: bucket === "btc_tactical",
    };
  });

  const blendedLow = toNumber(snapshot.currentApyLow);
  const blendedHigh = toNumber(snapshot.currentApyHigh);
  // CLAUDE.md #1: APY toujours en range.
  // `snapshot.stressedApy` (Decimal) reste un point en schéma — on dérive
  // un range ±0.4 pt autour du centre pour le MVP (méthodologie v1.0).
  // À remplacer par `stressedApyLow/High` natifs après la migration P1-3
  // listée dans docs/audit/coherence-2026-05-26/07-apy-range-rule.md.
  const stressedCenter = toNumber(snapshot.stressedApy);
  const stressedBearRange = {
    low: Math.round((stressedCenter - 0.4) * 10) / 10,
    high: Math.round((stressedCenter + 0.4) * 10) / 10,
  };

  return {
    sources,
    blendedLow,
    blendedHigh,
    stressedBearRange,
    methodologyVersion: "1.0",
    source: "live",
  };
}

/**
 * Build TimeToCashProps from the first active position and vault yield.
 * Returns neutral state when no investor / no active position.
 */
export async function loadTimeToCashProps(): Promise<TimeToCashProps & { source: "live" | "stale" }> {
  const now = new Date();
  const investor = await getInvestor();
  
  // Default cycle: 1st of current month, 30 days.
  const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const cycleDays = 30;

  if (!investor) {
    return {
      cycleStart,
      cycleDays,
      projectedUsdc: 0,
      aprLow: 0,
      aprHigh: 0,
      asOf: now,
      source: "stale",
    };
  }

  const [position, snapshot] = await Promise.all([
    prisma.position.findFirst({
      where: { investorId: investor.id, status: "active" },
      orderBy: { subscribedAt: "asc" },
    }),
    prisma.vaultSnapshot.findFirst({ orderBy: { takenAt: "desc" } }),
  ]);

  if (!position || !snapshot) {
    return {
      cycleStart,
      cycleDays,
      projectedUsdc: 0,
      aprLow: 0,
      aprHigh: 0,
      asOf: now,
      source: "stale",
    };
  }

  const principal = toNumber(position.principalUsdc);
  const aprLow = toNumber(snapshot.currentApyLow);
  const aprHigh = toNumber(snapshot.currentApyHigh);
  
  // Simple projection: principal * (avg apr / 12)
  const avgApr = (aprLow + aprHigh) / 2;
  const projectedUsdc = (principal * (avgApr / 100)) / 12;

  return {
    cycleStart,
    cycleDays,
    projectedUsdc,
    aprLow,
    aprHigh,
    asOf: now,
    source: "live",
  };
}

// ---------------------------------------------------------------------------
// loadTaxPreview — wires `getTaxPreview` to real YTD distribution data
// ---------------------------------------------------------------------------

/**
 * Build a TaxPreview backed by the investor's real positions and YTD
 * distributions.
 *
 * Why this exists: `getTaxPreview` is a pure stub that needs the caller to
 * pass real numbers via its `overrides` param. Without this loader, the LP
 * sees deterministic placeholder amounts (cf. P0-5 in
 * `docs/audit/coherence-2026-05-26/10-portfolio-lp-metrics.md`).
 *
 * Returns null when no investor is logged in so the caller can hide the
 * drawer entirely. Returns a `TaxPreview` even for investors with zero
 * positions — the drawer renders $0 values in that case, which is the
 * correct preview for a brand-new account.
 */
export async function loadTaxPreview(
  year: number = new Date().getUTCFullYear(),
): Promise<TaxPreview | null> {
  const investor = await getInvestor();
  if (!investor) return null;

  // YTD distributions (interest income for 1099-INT and CRS gross interest).
  const ytdStart = new Date(Date.UTC(year, 0, 1));
  const [positions, ytdDistribs] = await Promise.all([
    prisma.position.findMany({
      where: { investorId: investor.id },
      orderBy: { subscribedAt: "asc" },
    }),
    prisma.investorTransaction.findMany({
      where: {
        investorId: investor.id,
        type: { in: ["claim", "distribution"] },
        occurredAt: { gte: ytdStart },
      },
      select: { amountUsdc: true },
    }),
  ]);

  const actualInterestIncomeUsd = ytdDistribs.reduce(
    (sum, t) => sum + toNumber(t.amountUsdc),
    0,
  );
  const actualPrincipalUsd = positions.reduce(
    (sum, p) => sum + toNumber(p.principalUsdc),
    0,
  );
  const actualAccruedYieldUsd = positions.reduce(
    (sum, p) => sum + toNumber(p.accruedYieldUsdc),
    0,
  );
  // Days-held: contribution-weighted average across positions, same as the
  // engine's aggregateLpPnl logic.
  const now = new Date();
  let weightedDays = 0;
  let weightedBase = 0;
  for (const p of positions) {
    const contributed = toNumber(p.principalUsdc);
    if (contributed <= 0) continue;
    const d = daysHeldSince(p.subscribedAt, now);
    weightedDays += contributed * d;
    weightedBase += contributed;
  }
  const actualDaysHeld =
    weightedBase > 0 ? Math.floor(weightedDays / weightedBase) : 0;

  return getTaxPreview(investor.id, year, {
    actualInterestIncomeUsd,
    actualPrincipalUsd,
    actualAccruedYieldUsd,
    actualDaysHeld,
  });
}

// ---------------------------------------------------------------------------
// loadPosition — single position detail for /portfolio/[positionId]
// ---------------------------------------------------------------------------

export async function loadPosition(
  positionId: string,
): Promise<PositionDetail | null> {
  const investor = await getInvestor();
  if (!investor) return null;

  const [raw, rawTxs] = await Promise.all([
    prisma.position.findFirst({
      where: { id: positionId, investorId: investor.id },
      include: { vaultDeployment: true },
    }),
    // Load all transactions for this position (positionId + investorId are
    // already known — independent of the position row itself)
    prisma.investorTransaction.findMany({
      where: { investorId: investor.id, positionId },
      orderBy: { occurredAt: "desc" },
    }),
  ]);
  if (!raw) return null;

  const principal = toNumber(raw.principalUsdc);
  const accrued = toNumber(raw.accruedYieldUsdc);
  const distributed = toNumber(raw.distributedUsdc);

  const apyLowBps = raw.vaultDeployment?.targetApyLowBps ?? 940;
  const apyHighBps = raw.vaultDeployment?.targetApyHighBps ?? 1280;
  const vaultName = raw.vaultDeployment?.name ?? "Hearst Yield Vault";
  const vaultTicker = "HYV-A";

  const transactions: PositionDetailTransaction[] = rawTxs.map((t) => ({
    id: t.id,
    type: t.type as "deposit" | "claim" | "withdraw" | "distribution",
    amountUsdc: toNumber(t.amountUsdc),
    occurredAt: t.occurredAt,
    txHash: t.txHash,
  }));

  // txHashOpen: find the opening deposit transaction hash
  const openTx = rawTxs.find((t) => t.type === "deposit");

  const pnl = computeLpPnl({
    contributedUsdc: principal,
    distributedUsdc: distributed,
    accruedYieldUsdc: accrued,
    daysHeld: daysHeldSince(raw.subscribedAt, new Date()),
  });

  return {
    id: raw.id,
    vaultName,
    vaultTicker,
    status: raw.status as "active" | "matured" | "exited",
    principalUsdc: principal,
    accruedYieldUsdc: accrued,
    distributedUsdc: distributed,
    realizedApyLow: bpsToApyPct(apyLowBps),
    realizedApyHigh: bpsToApyPct(apyHighBps),
    subscribedAt: raw.subscribedAt,
    maturedAt: null, // populated in Phase 2
    txHashOpen: openTx?.txHash ?? null,
    transactions,
    pnl,
    source: "live",
  };
}
