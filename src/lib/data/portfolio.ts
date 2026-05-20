import "server-only";

import { prisma } from "@/lib/db";
import { getInvestor } from "@/lib/auth/session";

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

  // Fetch positions with optional VaultDeployment join for APY targets.
  const rawPositions = await prisma.position.findMany({
    where: { investorId: investor.id },
    include: { vaultDeployment: true },
    orderBy: { subscribedAt: "desc" },
  });

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
  const ytdStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const ytdTxs = await prisma.investorTransaction.findMany({
    where: {
      investorId: investor.id,
      type: { in: ["claim", "distribution"] },
      occurredAt: { gte: ytdStart },
    },
    select: { amountUsdc: true },
  });
  const totalYieldYtdUsdc =
    ytdTxs.reduce((sum, t) => sum + toNumber(t.amountUsdc), 0) +
    positions.reduce((sum, p) => sum + p.accruedYieldUsdc, 0);

  // Latest 5 transactions (any type).
  const rawTxs = await prisma.investorTransaction.findMany({
    where: { investorId: investor.id },
    orderBy: { occurredAt: "desc" },
    take: 5,
  });

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

  return {
    positions,
    totalValueUsdc,
    totalYieldYtdUsdc,
    nextDistributionAt: nextEndOfMonth(),
    recentTransactions,
    source: "live",
  };
}
