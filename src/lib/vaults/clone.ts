// src/lib/vaults/clone.ts
//
// Pure helper — maps a VaultRef to a Partial<FormState> suitable for
// pre-filling the wizard's create form.  Immutable fields (slug, address,
// contractAddress) are intentionally excluded so the clone starts fresh.
//
// No I/O, no server-only, no DB — safe to import from tests.

import type { VaultRef } from "@/lib/vaults/types";
import type { FormState } from "@/app/admin/vaults/_vault-form";

/**
 * Build pre-fill values from a source vault reference.
 *
 * Populated fields: name (+ " (clone)" suffix), apyMin, apyMax,
 * lockupDays, minTicket, mgmtFee, perfFee, requiredSigners,
 * strategy, colorTag, allocations, shareClass, spvJurisdiction,
 * regExemption, disclaimers.
 *
 * Omitted fields: ticker (must be unique), description (optional text,
 * left blank so the author writes fresh copy), signersWhitelist
 * (addresses are context-specific).
 */
export function cloneFormValues(source: VaultRef): Partial<FormState> {
  if (source.kind === "fixture") {
    const f = source.fixture;

    // Use first share class terms for economic defaults (class A = 60d, 100bps mgmt, etc.)
    const sc = f.shareClasses[0];
    const lockupDays = sc?.softLockupDays ?? 60;
    const minTicketUsdc = sc?.minTicketUsdc ?? 250_000;
    const mgmtFeeBps = sc?.mgmtFeeBps ?? 100;
    const perfFeeBps = sc?.perfFeeBps ?? 1_000;

    // Allocation targets: fixture stores percent (0-100), form stores bps
    const at = f.allocationTargets;

    return {
      name: `${f.label} (clone)`,
      strategy: "mining_yield", // safe default — wizard lets the author change it
      minTicketUsdc,
      mgmtFeeBps,
      perfFeeBps,
      targetApyLowBps: Math.round(f.apyTarget.low * 100),
      targetApyHighBps: Math.round(f.apyTarget.high * 100),
      softLockupDays: lockupDays,
      targetMiningBps: Math.round(at.mining * 100),
      targetBtcTacticalBps: Math.round(at.btc_tactical * 100),
      targetUsdcBaseBps: Math.round(at.usdc_base * 100),
      targetStableReserveBps: Math.round(at.stable_reserve * 100),
    };
  }

  // Deployment row
  const d = source.deployment;

  return {
    name: `${d.name} (clone)`,
    strategy: d.strategy as FormState["strategy"],
    colorTag: d.colorTag ?? "accent",
    minTicketUsdc: Number(d.minTicketUsdc),
    mgmtFeeBps: d.mgmtFeeBps,
    perfFeeBps: d.perfFeeBps,
    softLockupDays: d.softLockupDays,
    targetApyLowBps: d.targetApyLowBps,
    targetApyHighBps: d.targetApyHighBps,
    spvJurisdiction: d.spvJurisdiction as FormState["spvJurisdiction"],
    shareClass: d.shareClass,
    regExemption: d.regExemption as FormState["regExemption"],
    disclaimers: d.disclaimers,
    requiredSigners: d.requiredSigners,
    targetMiningBps: d.targetMiningBps,
    targetBtcTacticalBps: d.targetBtcTacticalBps,
    targetUsdcBaseBps: d.targetUsdcBaseBps,
    targetStableReserveBps: d.targetStableReserveBps,
  };
}
