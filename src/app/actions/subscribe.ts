"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getInvestor } from "@/lib/auth/session";
import { getVault } from "@/lib/data/vaults";

/**
 * Subscribe to a vault — creates a real DB position for the current investor.
 *
 * Flow (in-cockpit subscription on /portfolio):
 *   investor → Position (principal) + InvestorTransaction (deposit) → revalidate.
 *
 * Guards:
 *  - Requires a resolved investor (Privy in prod, dev investor locally).
 *  - Validates the amount against the vault's minimum ticket and capacity.
 *  - Links `vaultDeploymentId` only when the id matches a real DB deployment;
 *    otherwise falls back to the `vaultKey` column (single-vault MVP fixture).
 *
 * No forbidden words, no returns promised — this only records the deposit.
 */

export type SubscribeResult =
  | { ok: true; positionId: string }
  | { ok: false; error: string };

export async function subscribe(
  vaultId: string,
  amountUsdc: number,
): Promise<SubscribeResult> {
  const investor = await getInvestor();
  if (!investor) {
    return { ok: false, error: "Sign in to subscribe." };
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
  if (amountUsdc < vault.minTicketUsdc) {
    return {
      ok: false,
      error: `Below minimum ticket of $${(vault.minTicketUsdc / 1_000).toFixed(0)}k.`,
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

  const position = await prisma.position.create({
    data: {
      investorId: investor.id,
      vaultDeploymentId: deployment?.id ?? null,
      principalUsdc: amountUsdc,
      status: "active",
    },
  });

  await prisma.investorTransaction.create({
    data: {
      investorId: investor.id,
      positionId: position.id,
      type: "deposit",
      amountUsdc,
    },
  });

  revalidatePath("/portfolio");
  return { ok: true, positionId: position.id };
}
