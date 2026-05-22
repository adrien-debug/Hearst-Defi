// Multi-vault definitions (ADR-006). Each vault is a first-class entity with its
// OWN target assumptions, share classes, and default provenance — no vault may
// reuse another's numbers silently. This module is pure: no I/O, no DB. The data
// layer (src/lib/data/*) maps DB rows onto these presets; it never lives here.

import { SHARE_CLASS_A, SHARE_CLASS_B, type ShareClassTerms } from "./share-class";
import type { AllocationBucket, VaultId, VaultMode } from "./types";

export type { VaultId } from "./types";

// Provenance vocabulary mirrors CLAUDE.md #2 (Live / Oracle / Attested /
// Estimated / Manual / Stale). The default here is the worst-case label a vault
// definition can claim before live data is wired in.
export type Provenance =
  | "live"
  | "oracle"
  | "attested"
  | "estimated"
  | "manual"
  | "stale";

// APY targets are ALWAYS a range (non-negotiable #1) — never a single point.
export interface ApyTargetRange {
  low: number;
  high: number;
}

// Target allocation, in percent (0–100), per sleeve. Sums to ~100 per vault.
export type AllocationTargets = Record<AllocationBucket, number>;

export interface VaultDefinition {
  id: VaultId;
  ticker: string;
  label: string;
  /** One-line strategy description. Forbidden-words rule (#5) applies. */
  description: string;
  /** Annual APY target band (percent). low < high, always a range. */
  apyTarget: ApyTargetRange;
  /** Default vault mode the strategy centres on. */
  baseMode: VaultMode;
  /** Target sleeve allocation (percent, sums to ~100). */
  allocationTargets: AllocationTargets;
  /** Share classes this vault offers. */
  shareClasses: ShareClassTerms[];
  /** Default provenance for this vault's headline metrics. */
  defaultProvenance: Provenance;
  /** Methodology version these assumptions belong to. */
  methodologyVersion: string;
  /** Per-vault assumptions surfaced with every projection (#10). */
  assumptions: string[];
}

const METHODOLOGY_V1 = "v1.0";

// ── Hearst Yield Vault — existing flagship, 8–15% APY ────────────────────────
export const VAULT_YIELD: VaultDefinition = {
  id: "yield",
  ticker: "HYV",
  label: "Hearst Yield Vault",
  description:
    "Mining-backed structured yield with monthly USDC distributions, dynamically rebalanced across four sleeves by rule-based triggers.",
  apyTarget: { low: 8, high: 15 },
  baseMode: "balanced",
  allocationTargets: {
    mining: 60,
    btc_tactical: 25,
    usdc_base: 10,
    stable_reserve: 5,
  },
  shareClasses: [SHARE_CLASS_A, SHARE_CLASS_B],
  defaultProvenance: "estimated",
  methodologyVersion: METHODOLOGY_V1,
  assumptions: [
    "Balanced sleeve mix; mining is the dominant yield source.",
    "Monthly USDC distributions, 60-day soft lock-up (class A).",
    "Outputs are projections, not guaranteed. Past performance does not predict future results.",
  ],
};

// ── Hearst Defensive Vault — lower risk, 5–8% APY, mining 15–25% ─────────────
export const VAULT_DEFENSIVE: VaultDefinition = {
  id: "defensive",
  ticker: "HDV",
  label: "Hearst Defensive Vault",
  description:
    "Capital-preservation tilt: a larger stable reserve and USDC base sleeve, with mining capped at a low band to dampen drawdowns.",
  apyTarget: { low: 5, high: 8 },
  baseMode: "defensive",
  allocationTargets: {
    mining: 20,
    btc_tactical: 10,
    usdc_base: 35,
    stable_reserve: 35,
  },
  shareClasses: [SHARE_CLASS_A, SHARE_CLASS_B],
  defaultProvenance: "estimated",
  methodologyVersion: METHODOLOGY_V1,
  assumptions: [
    "Mining exposure held in the 15–25% band; majority in stable reserve and USDC base.",
    "Designed to reduce volatility versus the Yield Vault, at the cost of upside.",
    "Outputs are projections, not guaranteed. Past performance does not predict future results.",
  ],
};

// ── Hearst BTC Plus Vault — higher tactical BTC, 10–20% APY ──────────────────
export const VAULT_BTC_PLUS: VaultDefinition = {
  id: "btc-plus",
  ticker: "HBP",
  label: "Hearst BTC Plus Vault",
  description:
    "Upside-tilted strategy with a heavier BTC tactical sleeve alongside mining, accepting wider drawdowns for higher projected yield.",
  apyTarget: { low: 10, high: 20 },
  baseMode: "opportunistic",
  allocationTargets: {
    mining: 40,
    btc_tactical: 45,
    usdc_base: 10,
    stable_reserve: 5,
  },
  shareClasses: [SHARE_CLASS_A, SHARE_CLASS_B],
  defaultProvenance: "estimated",
  methodologyVersion: METHODOLOGY_V1,
  assumptions: [
    "BTC tactical sleeve is the largest single allocation; mining is secondary.",
    "Higher projected band reflects greater BTC delta and lower stable buffer.",
    "Outputs are projections, not guaranteed. Past performance does not predict future results.",
  ],
};

export const VAULTS: Record<VaultId, VaultDefinition> = {
  yield: VAULT_YIELD,
  defensive: VAULT_DEFENSIVE,
  "btc-plus": VAULT_BTC_PLUS,
};

export function getVaultDefinition(id: VaultId): VaultDefinition {
  const def = VAULTS[id];
  if (!def) {
    throw new Error(`unknown vault id: ${String(id)}`);
  }
  return def;
}

// allocationWeights in the V2 scenario contract are fractions summing to 1.0.
// A vault's allocationTargets are percentages; this is the bridge so a vault can
// be fed straight into runScenario without callers hardcoding the Yield mix.
export interface VaultAllocationWeights {
  mining: number;
  btcTactical: number;
  usdcBase: number;
  stableReserve: number;
}

export function vaultAllocationWeights(
  vault: VaultDefinition = VAULT_YIELD,
): VaultAllocationWeights {
  const t = vault.allocationTargets;
  const sum = t.mining + t.btc_tactical + t.usdc_base + t.stable_reserve;
  const denom = sum === 0 ? 1 : sum;
  return {
    mining: t.mining / denom,
    btcTactical: t.btc_tactical / denom,
    usdcBase: t.usdc_base / denom,
    stableReserve: t.stable_reserve / denom,
  };
}
