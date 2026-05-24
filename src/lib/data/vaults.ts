import "server-only";

import { type VaultDeployment } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  VAULT_DEFENSIVE,
  VAULT_BTC_PLUS,
  type VaultDefinition,
} from "@/lib/engine/vaults";

// ---------------------------------------------------------------------------
// VaultProduct — the canonical shape consumed by /vaults and /vaults/[id].
// Multi-vault enabled per ADR-006 (lifts #9): Yield / Defensive / BTC Plus.
// Each vault carries its own assumptions/share-class/provenance — derived from
// the engine VaultDefinition presets so numbers are never duplicated.
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

// Derive a VaultProduct fixture from an engine VaultDefinition (Defensive /
// BTC Plus). Strategy + risk follow the dominant sleeve; share-class A terms
// drive ticket/lock-up/fees. AUM defaults to 0 (no live snapshot for these yet).
function fixtureFromDefinition(def: VaultDefinition): VaultProduct {
  const a = def.allocationTargets;
  const classA = def.shareClasses[0];
  const strategy: VaultProduct["strategy"] =
    a.btc_tactical >= a.mining
      ? "btc_tactical"
      : a.mining >= 40
        ? "mining_yield"
        : "stable_reserve";
  return {
    id: `hearst-${def.id}-vault`,
    ticker: `${def.ticker}-A`,
    name: def.label,
    description: def.description,
    strategy,
    status: "review",
    apyLow: def.apyTarget.low,
    apyHigh: def.apyTarget.high,
    minTicketUsdc: classA?.minTicketUsdc ?? 250_000,
    softLockupDays: classA?.softLockupDays ?? 60,
    capacityUsdc: 100_000_000,
    currentAumUsdc: 0,
    fees: {
      mgmtBps: classA?.mgmtFeeBps ?? 200,
      perfBps: classA?.perfFeeBps ?? 1000,
      hurdleBps: classA?.hurdleBps ?? 0,
    },
    riskLevel: a.mining >= 7500 ? "moderate" : a.mining >= 40 ? "low-moderate" : "low",
    spvJurisdiction: "cayman",
    shareClass: "A",
    regExemption: "regS",
    disclaimers: def.assumptions.join(" "),
    targetMiningBps: a.mining * 100,
    targetBtcTacticalBps: a.btc_tactical * 100,
    targetUsdcBaseBps: a.usdc_base * 100,
    targetStableReserveBps: a.stable_reserve * 100,
  };
}

const DEFENSIVE_VAULT_FIXTURE = fixtureFromDefinition(VAULT_DEFENSIVE);
const BTC_PLUS_VAULT_FIXTURE = fixtureFromDefinition(VAULT_BTC_PLUS);

/** All fixture vaults returned when the DB has no VaultDeployment rows. */
const FIXTURE_VAULTS: VaultProduct[] = [
  HEARST_YIELD_VAULT_FIXTURE,
  DEFENSIVE_VAULT_FIXTURE,
  BTC_PLUS_VAULT_FIXTURE,
];

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

function toVaultProduct(row: VaultDeployment, aumUsdc: number): VaultProduct {
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

// Yield Vault recognition — ADR-006 #9: the current `VaultSnapshot` schema is
// not yet keyed per vault, so the only snapshot we hold is the Hearst Yield
// Vault timeline. Any other row in `VaultDeployment` MUST keep `currentAumUsdc
// = 0` until Phase 3 adds `VaultSnapshot.vaultDeploymentId`; otherwise the
// Yield AUM would silently appear under every vault's card.
function isYieldVaultRow(row: VaultDeployment): boolean {
  return (
    row.ticker === "HYV-A" ||
    row.ticker.toUpperCase().startsWith("HYV") ||
    row.id === "hearst-yield-vault"
  );
}

export async function listVaults(): Promise<VaultProduct[]> {
  try {
    const rows = await prisma.vaultDeployment.findMany({
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    if (rows.length === 0) return FIXTURE_VAULTS;

    // Fetch the latest AUM snapshot — only applied to the Yield Vault row.
    // Non-Yield vaults stay at 0 until per-vault snapshots land (Phase 3).
    const latestSnapshots = await prisma.vaultSnapshot.findMany({
      orderBy: { takenAt: "desc" },
      take: 1,
    });
    const latestAum = latestSnapshots[0]?.aumUsdc?.toNumber() ?? 0;

    return rows.map((row) =>
      toVaultProduct(row, isYieldVaultRow(row) ? latestAum : 0),
    );
  } catch {
    // DB unavailable (e.g. fresh dev box) — return fixtures
    return FIXTURE_VAULTS;
  }
}

/** Resolve a fixture vault by id or ticker (case-insensitive). */
function fixtureByIdOrTicker(idOrTicker: string): VaultProduct | null {
  const key = idOrTicker.toLowerCase();
  return (
    FIXTURE_VAULTS.find(
      (v) => v.id.toLowerCase() === key || v.ticker.toLowerCase() === key,
    ) ?? null
  );
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
      const [row, snapshot] = await Promise.all([
        prisma.vaultDeployment.findFirst({
          where: { ticker: "HYV-A" },
        }),
        prisma.vaultSnapshot.findFirst({
          orderBy: { takenAt: "desc" },
        }),
      ]);
      if (!row) return HEARST_YIELD_VAULT_FIXTURE;

      return toVaultProduct(
        row,
        snapshot?.aumUsdc?.toNumber() ?? 0,
      );
    } catch {
      return HEARST_YIELD_VAULT_FIXTURE;
    }
  }

  try {
    const [row, snapshot] = await Promise.all([
      prisma.vaultDeployment.findFirst({
        where: {
          OR: [{ id: idOrTicker }, { ticker: idOrTicker }],
        },
      }),
      prisma.vaultSnapshot.findFirst({
        orderBy: { takenAt: "desc" },
      }),
    ]);
    if (!row) return fixtureByIdOrTicker(idOrTicker);

    return toVaultProduct(
      row,
      snapshot?.aumUsdc?.toNumber() ?? 0,
    );
  } catch {
    return fixtureByIdOrTicker(idOrTicker);
  }
}
