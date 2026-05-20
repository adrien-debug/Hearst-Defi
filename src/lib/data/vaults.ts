import "server-only";

import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// VaultProduct — the canonical shape consumed by /vaults and /vaults/[id].
// Single vault at MVP (CLAUDE.md non-negotiable #9). Grid is forward-compatible
// for future vaults without multi-vault UI abstractions today.
// ---------------------------------------------------------------------------

export interface VaultProduct {
  id: string;
  ticker: string;
  name: string;
  description: string;
  strategy: "mining_yield" | "btc_tactical" | "stable_reserve";
  status: "live" | "draft" | "review" | "paused" | "closed";
  apyLow: number; // %, e.g. 9.4
  apyHigh: number;
  minTicketUsdc: number;
  softLockupDays: number;
  capacityUsdc: number;
  currentAumUsdc: number; // from VaultSnapshot OR 0
  fees: { mgmtBps: number; perfBps: number; hurdleBps: number };
  riskLevel: "low" | "low-moderate" | "moderate" | "high";
  spvJurisdiction: string;
  shareClass: string;
  regExemption: string;
  disclaimers: string;
  // Target allocations per bucket (basis points, 0–10000)
  targetMiningBps: number;
  targetBtcTacticalBps: number;
  targetUsdcBaseBps: number;
  targetStableReserveBps: number;
}

// ---------------------------------------------------------------------------
// Inline MVP fixture — returned when DB has no VaultDeployment rows.
// Non-negotiable #10: disclaimers verbatim from methodology v1.0.
// Non-negotiable #1: APY always as a range, never a single point.
// ---------------------------------------------------------------------------

const HEARST_YIELD_VAULT_FIXTURE: VaultProduct = {
  id: "hearst-yield-vault",
  ticker: "HYV-A",
  name: "Hearst Yield Vault",
  description:
    "Mining-backed structured yield with monthly USDC distributions. The vault allocates across four sleeves: Bitcoin mining operations, BTC tactical delta, USDC base lending, and stable reserve — dynamically rebalanced by rule-based triggers.",
  strategy: "mining_yield",
  status: "live",
  apyLow: 9.4,
  apyHigh: 12.8,
  minTicketUsdc: 250_000,
  softLockupDays: 60,
  capacityUsdc: 100_000_000,
  currentAumUsdc: 42_500_000,
  fees: { mgmtBps: 200, perfBps: 1000, hurdleBps: 0 },
  riskLevel: "low-moderate",
  spvJurisdiction: "cayman",
  shareClass: "A",
  regExemption: "regS",
  disclaimers:
    "Projections are conditional on stated assumptions. Past performance does not indicate future results. Hearst Yield Vault is offered exclusively to professional / qualified investors via a Cayman Exempted Limited Partnership. Subject to minimum subscription, soft lock-up, and jurisdictional restrictions. Not an offer or solicitation where prohibited.",
  targetMiningBps: 6000,
  targetBtcTacticalBps: 2500,
  targetUsdcBaseBps: 1000,
  targetStableReserveBps: 500,
};

// ---------------------------------------------------------------------------
// Map Prisma VaultDeployment row → VaultProduct.
// VaultDeployment.status uses "deployed" instead of "live" — normalise here.
// ---------------------------------------------------------------------------

function normaliseStatus(
  raw: string,
): VaultProduct["status"] {
  const map: Record<string, VaultProduct["status"]> = {
    live: "live",
    deployed: "live",
    draft: "draft",
    review: "review",
    paused: "paused",
    closed: "closed",
  };
  return map[raw] ?? "draft";
}

function normaliseStrategy(
  raw: string,
): VaultProduct["strategy"] {
  if (
    raw === "mining_yield" ||
    raw === "btc_tactical" ||
    raw === "stable_reserve"
  )
    return raw;
  return "mining_yield";
}

function riskLevelFromBps(
  minTicket: number,
  miningBps: number,
): VaultProduct["riskLevel"] {
  if (miningBps >= 7500) return "moderate";
  if (miningBps >= 5000) return "low-moderate";
  return "low";
}

interface PrismaVaultRow {
  id: string;
  ticker: string;
  name: string;
  description: string | null;
  strategy: string;
  status: string;
  targetApyLowBps: number;
  targetApyHighBps: number;
  minTicketUsdc: { toNumber(): number };
  capacityUsdc: { toNumber(): number };
  mgmtFeeBps: number;
  perfFeeBps: number;
  hurdleBps: number;
  softLockupDays: number;
  spvJurisdiction: string;
  shareClass: string;
  regExemption: string;
  disclaimers: string;
  targetMiningBps: number;
  targetBtcTacticalBps: number;
  targetUsdcBaseBps: number;
  targetStableReserveBps: number;
}

function toVaultProduct(row: PrismaVaultRow, aumUsdc: number): VaultProduct {
  const miningBps = row.targetMiningBps;
  return {
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    description: row.description ?? "",
    strategy: normaliseStrategy(row.strategy),
    status: normaliseStatus(row.status),
    apyLow: row.targetApyLowBps / 100,
    apyHigh: row.targetApyHighBps / 100,
    minTicketUsdc: row.minTicketUsdc.toNumber(),
    softLockupDays: row.softLockupDays,
    capacityUsdc: row.capacityUsdc.toNumber(),
    currentAumUsdc: aumUsdc,
    fees: {
      mgmtBps: row.mgmtFeeBps,
      perfBps: row.perfFeeBps,
      hurdleBps: row.hurdleBps,
    },
    riskLevel: riskLevelFromBps(row.minTicketUsdc.toNumber(), miningBps),
    spvJurisdiction: row.spvJurisdiction,
    shareClass: row.shareClass,
    regExemption: row.regExemption,
    disclaimers: row.disclaimers,
    targetMiningBps: row.targetMiningBps,
    targetBtcTacticalBps: row.targetBtcTacticalBps,
    targetUsdcBaseBps: row.targetUsdcBaseBps,
    targetStableReserveBps: row.targetStableReserveBps,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listVaults(): Promise<VaultProduct[]> {
  try {
    const rows = await prisma.vaultDeployment.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (rows.length === 0) return [HEARST_YIELD_VAULT_FIXTURE];

    // Fetch the latest AUM snapshot for each vault
    const latestSnapshots = await prisma.vaultSnapshot.findMany({
      orderBy: { takenAt: "desc" },
      take: 1,
    });
    const latestAum = latestSnapshots[0]?.aumUsdc?.toNumber() ?? 0;

    return rows.map((row) =>
      toVaultProduct(row as unknown as PrismaVaultRow, latestAum),
    );
  } catch {
    // DB unavailable (e.g. fresh dev box) — return fixture
    return [HEARST_YIELD_VAULT_FIXTURE];
  }
}

export async function getVault(
  idOrTicker: string,
): Promise<VaultProduct | null> {
  // Fixture short-circuit for the single MVP vault
  if (
    idOrTicker === "hearst-yield-vault" ||
    idOrTicker === "HYV-A" ||
    idOrTicker === "hyv-a"
  ) {
    try {
      const row = await prisma.vaultDeployment.findFirst({
        where: { ticker: "HYV-A" },
      });
      if (!row) return HEARST_YIELD_VAULT_FIXTURE;

      const snapshot = await prisma.vaultSnapshot.findFirst({
        orderBy: { takenAt: "desc" },
      });
      return toVaultProduct(
        row as unknown as PrismaVaultRow,
        snapshot?.aumUsdc?.toNumber() ?? 0,
      );
    } catch {
      return HEARST_YIELD_VAULT_FIXTURE;
    }
  }

  try {
    const row = await prisma.vaultDeployment.findFirst({
      where: {
        OR: [{ id: idOrTicker }, { ticker: idOrTicker }],
      },
    });
    if (!row) return null;

    const snapshot = await prisma.vaultSnapshot.findFirst({
      orderBy: { takenAt: "desc" },
    });
    return toVaultProduct(
      row as unknown as PrismaVaultRow,
      snapshot?.aumUsdc?.toNumber() ?? 0,
    );
  } catch {
    return null;
  }
}
