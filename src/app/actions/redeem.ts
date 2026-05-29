"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getInvestor } from "@/lib/auth/session";

/**
 * Redeem (withdraw) from a vault position — records the off-chain side of an
 * ERC-4626 `redeem`. The on-chain burn+transfer is executed client-side via
 * `redeemFromVault` (src/lib/onchain/vault.ts); this action persists the result:
 *
 *   investor → InvestorTransaction(type="withdraw") → Position reduced/exited → revalidate.
 *
 * Guards:
 *  - Requires the resolved investor and ownership of the position.
 *  - Position must be `active`.
 *  - Amount must be positive and not exceed the remaining principal.
 *  - Full redemption (amount ≥ principal) marks the position `exited` with
 *    `exitedAt`; a partial redemption reduces `principalUsdc` and stays active.
 *
 * No returns promised — this only records the withdrawal.
 */

export type RedeemResult =
  | { ok: true; positionId: string; closed: boolean }
  | { ok: false; error: string };

export async function redeem(
  positionId: string,
  amountUsdc: number,
  txHash?: string,
): Promise<RedeemResult> {
  const investor = await getInvestor();
  if (!investor) {
    throw new Error("Unauthenticated");
  }

  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: { id: true, investorId: true, status: true, principalUsdc: true },
  });

  if (!position || position.investorId !== investor.id) {
    return { ok: false, error: "Position not found." };
  }
  if (position.status !== "active") {
    return { ok: false, error: "Position is not active." };
  }

  const principal = position.principalUsdc.toNumber();
  if (amountUsdc > principal + 0.5) {
    return { ok: false, error: "Amount exceeds your position principal." };
  }

  const closed = amountUsdc >= principal - 0.5;

  // Atomic: record the withdrawal transaction AND update the position together.
  await prisma.$transaction([
    prisma.investorTransaction.create({
      data: {
        investorId: investor.id,
        positionId: position.id,
        type: "withdraw",
        amountUsdc: new Prisma.Decimal(amountUsdc),
        txHash: txHash ?? null,
      },
    }),
    prisma.position.update({
      where: { id: position.id },
      data: closed
        ? { status: "exited", exitedAt: new Date(), principalUsdc: new Prisma.Decimal(0) }
        : { principalUsdc: new Prisma.Decimal(principal - amountUsdc) },
    }),
  ]);

  revalidatePath("/portfolio");
  return { ok: true, positionId: position.id, closed };
}
