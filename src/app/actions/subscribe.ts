"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getInvestor } from "@/lib/auth/session";
import { getVault } from "@/lib/data/vaults";
import { SHARE_CLASS_A, SHARE_CLASS_B, type ShareClassTerms } from "@/lib/engine/share-class";

/**
 * Subscribe to a vault — creates a real DB position for the current investor.
 *
 * Flow (in-cockpit subscription on /portfolio):
 *   investor → Position (principal) + InvestorTransaction (deposit) → revalidate.
 *
 * Guards:
 *  - Requires a resolved investor (Privy in prod, dev investor locally).
 *  - Validates the amount against the vault's minimum ticket and capacity.
 *  - Validates the classCode against the share class terms (A: $250k/60d, B: $1M/90d).
 *  - Links `vaultDeploymentId` only when the id matches a real DB deployment;
 *    otherwise falls back to the `vaultKey` column (single-vault MVP fixture).
 *
 * No forbidden words, no returns promised — this only records the deposit.
 */

/** Hard ceiling on a single subscription amount (1 billion USDC). */
const MAX_SUBSCRIBE_USDC = 1_000_000_000;

/** Supported share class codes. */
export type ShareClassCode = "A" | "B";

export type SubscribeResult =
  | { ok: true; positionId: string }
  | { ok: false; error: string };

/** Resolve the canonical terms for a given share class code. */
function resolveClassTerms(classCode: ShareClassCode): ShareClassTerms {
  return classCode === "B" ? SHARE_CLASS_B : SHARE_CLASS_A;
}

export async function subscribe(
  vaultId: string,
  amountUsdc: number,
  classCode: ShareClassCode = "A",
  txHash?: string,
): Promise<SubscribeResult> {
  const investor = await getInvestor();
  if (!investor) {
    throw new Error("Unauthenticated");
  }

  // C-01: KYC gate — only approved investors may subscribe.
  if (investor.kycStatus !== "approved") {
    return { ok: false, error: "KYC approval required before subscribing." };
  }

  if (amountUsdc > MAX_SUBSCRIBE_USDC) {
    return { ok: false, error: "Amount too large." };
  }

  const vault = await getVault(vaultId);
  if (!vault) {
    return { ok: false, error: "Vault not found." };
  }
  if (vault.status !== "live") {
    return { ok: false, error: "This vault is not open for subscription." };
  }

  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }

  // Validate against the selected share class minimum ticket.
  const classTerms = resolveClassTerms(classCode);
  if (amountUsdc < classTerms.minTicketUsdc) {
    return {
      ok: false,
      error: `Below minimum ticket of $${(classTerms.minTicketUsdc / 1_000).toFixed(0)}k for Class ${classCode}.`,
    };
  }

  const remaining = vault.capacityUsdc - vault.currentAumUsdc;
  if (amountUsdc > remaining) {
    return { ok: false, error: "Amount exceeds remaining capacity." };
  }

  // Link to a real VaultDeployment row only if the id resolves to one;
  // the inline fixture id ("hearst-yield-vault") has no DB row → vaultKey fallback.
  const deployment = await prisma.vaultDeployment.findUnique({
    where: { id: vaultId },
    select: { id: true },
  });

  // Atomic: position + transaction are created in a single implicit transaction
  // via Prisma nested write. If either fails, neither is persisted.
  const position = await prisma.position.create({
    data: {
      investorId: investor.id,
      vaultDeploymentId: deployment?.id ?? null,
      // Store the share class code in the vaultKey field as a suffix so that
      // downstream loaders can distinguish A vs B positions without a schema
      // migration (additive, non-breaking to E1 Class A positions).
      vaultKey: `${vaultId}:class-${classCode}`,
      principalUsdc: amountUsdc,
      status: "active",
      // On-chain deposit tx hash (Base Sepolia). Null for in-cockpit/manual
      // subscriptions that did not originate from a signed vault deposit.
      txHashOpen: txHash ?? null,
      transactions: {
        create: {
          investorId: investor.id,
          type: "deposit",
          amountUsdc,
          txHash: txHash ?? null,
        },
      },
    },
  });

  revalidatePath("/portfolio");
  return { ok: true, positionId: position.id };
}
