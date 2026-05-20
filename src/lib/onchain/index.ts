// src/lib/onchain/index.ts
// MVP stubs — all on-chain interactions return deterministic simulated results
// after a brief delay. Real contract wiring is deferred to sc-dev phase (ERC-4626).
// Non-negotiable #8: smart contracts testnet event logger Phase 2 only.
// Non-negotiable #6: engine stays pure — no on-chain deps in src/lib/engine/*.

import type { VaultProduct } from "@/lib/data/vaults";

const STUB_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApproveOpts {
  vaultId: string;
  amount: number; // USDC, integer cents equivalent
}

export interface DepositOpts {
  vault: VaultProduct;
  amount: number; // USDC
}

export interface ApproveResult {
  success: true;
  txHash: string;
}

export interface DepositResult {
  success: true;
  txHash: string;
  amount: number;
}

export type EpochStatus = "ACTIVE" | "ENDING" | "SYNC";

export interface EpochInfo {
  status: EpochStatus;
  endsInDays: number;
}

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

/** Simulate USDC approve to vault contract. */
export async function stubApprove(opts: ApproveOpts): Promise<ApproveResult> {
  await delay(STUB_DELAY_MS);
  return {
    success: true,
    txHash: `0xstub_approve_${opts.vaultId}_${Date.now().toString(16)}`,
  };
}

/** Simulate vault deposit (ERC-4626 stub). */
export async function stubDeposit(opts: DepositOpts): Promise<DepositResult> {
  await delay(STUB_DELAY_MS);
  return {
    success: true,
    txHash: `0xstub_deposit_${opts.vault.id}_${Date.now().toString(16)}`,
    amount: opts.amount,
  };
}

/** Return current epoch status. MVP: always ACTIVE. */
export function stubEpoch(): EpochInfo {
  return { status: "ACTIVE", endsInDays: 18 };
}

/** Abbreviate wallet address for display: 0xABCD…EF12 */
export function abbreviateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
