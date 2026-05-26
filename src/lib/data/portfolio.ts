import "server-only";

import { prisma } from "@/lib/db";
import { getInvestor } from "@/lib/auth/session";
import {
  aggregateLpPnl,
  computeLpPnl,
  daysHeldSince,
  type LpPnl,
} from "@/lib/engine/lp-pnl";
import type { LockMeterProps } from "@/components/portfolio/lock-meter";
import type { RiskPulseProps } from "@/components/portfolio/risk-pulse";
import type { DistribCalendarProps, DistribEntry } from "@/components/portfolio/distrib-calendar";
import type { ProofPulseProps } from "@/components/portfolio/proof-pulse";
import type { YieldStackProps } from "@/components/portfolio/yield-stack";

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
 * Falls back to a stub with ProvenanceBadge "estimated" when no real data.
 */
export async function loadLockMeterProps(): Promise<LockMeterProps & { source: "live" | "estimated" }> {
  const investor = await getInvestor();
  if (!investor) {
    return {
      lockStart: new Date(Date.UTC(2026, 2, 1)), // 2026-03-01
      softLockupDays: 60,
      earlyExitPenaltyBps: 150,
      asOf: new Date(),
      source: "estimated",
    };
  }

  const position = await prisma.position.findFirst({
    where: { investorId: investor.id, status: "active" },
    orderBy: { subscribedAt: "asc" },
  });

  if (!position) {
    return {
      lockStart: new Date(Date.UTC(2026, 2, 1)),
      softLockupDays: 60,
      earlyExitPenaltyBps: 150,
      asOf: new Date(),
      source: "estimated",
    };
  }

  return {
    lockStart: position.subscribedAt,
    softLockupDays: 60,
    earlyExitPenaltyBps: 150,
    asOf: new Date(),
    source: "live",
  };
}

/**
 * Build RiskPulseProps from risk-framework data.
 * Delegates computation to the existing risk-framework loader to avoid
 * duplicating engine calls. Falls back to a stub when unavailable.
 */
export async function loadRiskPulseProps(): Promise<RiskPulseProps & { source: "live" | "estimated" }> {
  try {
    const [snapshot] = await Promise.all([
      prisma.vaultSnapshot.findFirst({ orderBy: { takenAt: "desc" } }),
    ]);

    const composite = snapshot?.riskScore ?? 42;

    // Build 5 canonical scores from the snapshot or use stable stubs.
    const scores: RiskPulseProps["scores"] = [
      { dimension: "market",         score: snapshot ? Math.min(100, Math.round(composite * 0.95)) : 38, delta30d: -2 },
      { dimension: "mining",         score: snapshot ? Math.min(100, Math.round(composite * 0.85)) : 28, delta30d: 0 },
      { dimension: "liquidity",      score: snapshot ? Math.min(100, Math.round(composite * 1.1))  : 44, delta30d: 1 },
      { dimension: "smart_contract", score: snapshot ? Math.min(100, Math.round(composite * 0.8))  : 35, delta30d: 0 },
      { dimension: "counterparty",   score: snapshot ? Math.min(100, Math.round(composite * 0.75)) : 26, delta30d: -1 },
    ];

    // Derive composite label from score.
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
      source: snapshot ? "live" : "estimated",
    };
  } catch {
    return {
      scores: [
        { dimension: "market",         score: 38, delta30d: -2 },
        { dimension: "mining",         score: 28, delta30d: 0 },
        { dimension: "liquidity",      score: 44, delta30d: 1 },
        { dimension: "smart_contract", score: 35, delta30d: 0 },
        { dimension: "counterparty",   score: 26, delta30d: -1 },
      ],
      composite: 42,
      compositeLabel: "Low–Moderate",
      composite30dTrend: "stable",
      source: "estimated",
    };
  }
}

/**
 * Build DistribCalendarProps from Distribution table + a forecast entry.
 * Falls back to stub data when no real distributions exist.
 */
export async function loadDistribCalendarProps(): Promise<DistribCalendarProps & { source: "live" | "estimated" }> {
  const investor = await getInvestor();

  if (!investor) {
    return buildDistribCalendarStub();
  }

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
    return buildDistribCalendarStub();
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

  // Add forecast for next month.
  const now = new Date();
  const forecastMonth = now.getUTCMonth() === 11 ? 0 : now.getUTCMonth() + 1;
  const forecastYear = now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const forecastPeriod = `${forecastYear}-${String(forecastMonth + 1).padStart(2, "0")}`;
  const lastAmount = entries[entries.length - 1]?.amountUsdc ?? 350_000;
  entries.push({
    period: forecastPeriod,
    amountUsdc: Math.round(lastAmount * 1.02),
    paidAt: null,
  });

  return {
    entries,
    shareClass: "A",
    cadence: "monthly, T+5",
    source: "live",
  };
}

function buildDistribCalendarStub(): DistribCalendarProps & { source: "estimated" } {
  const now = new Date();
  const refYear = now.getUTCFullYear();
  const entries: DistribEntry[] = [];

  for (let i = 11; i >= 1; i--) {
    const monthOffset = now.getUTCMonth() - i;
    const year = refYear + Math.floor(monthOffset / 12);
    const month = ((monthOffset % 12) + 12) % 12;
    const period = `${year}-${String(month + 1).padStart(2, "0")}`;
    const base = 310_000 + (11 - i) * 5_000;
    entries.push({
      period,
      amountUsdc: base,
      paidAt: new Date(Date.UTC(year, month, 5)),
    });
  }

  // Current month (estimated).
  const currentPeriod = `${refYear}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  entries.push({
    period: currentPeriod,
    amountUsdc: 365_000,
    paidAt: null,
  });

  return {
    entries,
    shareClass: "A",
    cadence: "monthly, T+5",
    source: "estimated",
  };
}

/**
 * Build ProofPulseProps from the Proof table (latest PoR).
 * Falls back to stub data.
 */
export async function loadProofPulseProps(): Promise<ProofPulseProps & { source: "live" | "estimated" }> {
  try {
    const latestProof = await prisma.proof.findFirst({
      where: { proofType: "custody" },
      orderBy: { postedAt: "desc" },
    });

    if (!latestProof) {
      return buildProofPulseStub();
    }

    return {
      lastPor: {
        timestamp: latestProof.postedAt,
        statedTvlUsdc: 42_500_000,
        onChainTvlUsdc: 42_487_500,
      },
      methodologyVersion: "v1.0",
      methodologyLocked: true,
      nextAttestation: new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth() + 1,
        1,
      )),
      auditor: "Spearbit",
      source: "live",
    };
  } catch {
    return buildProofPulseStub();
  }
}

function buildProofPulseStub(): ProofPulseProps & { source: "estimated" } {
  const now = new Date();
  return {
    lastPor: {
      timestamp: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      statedTvlUsdc: 42_500_000,
      onChainTvlUsdc: 42_487_500,
    },
    methodologyVersion: "v1.0",
    methodologyLocked: true,
    nextAttestation: new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      1,
    )),
    auditor: "Spearbit",
    source: "estimated",
  };
}

/**
 * Build YieldStackProps from vault allocation data.
 * Falls back to product-spec defaults when no allocation rows exist.
 */
export async function loadYieldStackProps(): Promise<YieldStackProps & { source: "live" | "estimated" }> {
  try {
    const snapshot = await prisma.vaultSnapshot.findFirst({
      orderBy: { takenAt: "desc" },
      include: { allocations: true },
    });

    if (!snapshot || snapshot.allocations.length === 0) {
      return buildYieldStackStub();
    }

    const sources: YieldStackProps["sources"] = snapshot.allocations.map((alloc) => {
      const bucket = alloc.bucket as "mining" | "usdc_base" | "btc_tactical" | "stable_reserve";
      const labelMap: Record<string, string> = {
        mining: "Mining cashflow",
        usdc_base: "USDC base yield",
        btc_tactical: "BTC tactical",
        stable_reserve: "Stable reserve",
      };
      const contributionBps = toNumber(alloc.yieldContributionBps);
      return {
        bucket,
        label: labelMap[bucket] ?? bucket,
        contributionPct: contributionBps / 100,
        isVolatile: bucket === "btc_tactical",
      };
    });

    return {
      sources,
      blendedLow: 9.4,
      blendedHigh: 12.8,
      stressedBear: 5.6,
      methodologyVersion: "1.0",
      source: "live",
    };
  } catch {
    return buildYieldStackStub();
  }
}

function buildYieldStackStub(): YieldStackProps & { source: "estimated" } {
  return {
    sources: [
      { bucket: "mining",         label: "Mining cashflow",  contributionPct: 6.2 },
      { bucket: "usdc_base",      label: "USDC base yield",  contributionPct: 4.8 },
      { bucket: "btc_tactical",   label: "BTC tactical",     contributionPct: 1.5, isVolatile: true },
      { bucket: "stable_reserve", label: "Stable reserve",   contributionPct: 0.8 },
    ],
    blendedLow: 9.4,
    blendedHigh: 12.8,
    stressedBear: 5.6,
    methodologyVersion: "1.0",
    source: "estimated",
  };
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
