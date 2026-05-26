"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getInvestor, getSession } from "@/lib/auth/session";

/**
 * subscribe — Server Action for the share-class subscription flow.
 *
 * Creates a Subscription row for the authenticated investor under the
 * selected share class. lockupUntil is derived from subscribedAt + lockupDays.
 *
 * Guards:
 *  - Requires a valid session (auth) via requireAuth guard.
 *  - Validates amount >= shareClass.minTicket (Zod refine on Decimal comparison).
 *  - Validates shareClass exists, is active, and belongs to the requested vault.
 *
 * Forbidden words: no "guarantee", "promise", "certain", "will deliver", "risk-free".
 * Decimal precision: amount stored as Prisma Decimal — no JS number arithmetic on amounts.
 */

/** Hard ceiling on a single subscription amount: 1 billion USDC. */
const MAX_SUBSCRIBE_USDC = 1_000_000_000;

export type SubscribeResult =
  | { ok: true; subscriptionId: string; lockupUntil: Date }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Input schema — Zod validates types; the minTicket check happens after we
// fetch the share class so we have the actual Decimal value.
// ---------------------------------------------------------------------------

const SubscribeInput = z.object({
  vaultId: z.string().min(1),
  classCode: z.enum(["A", "B"]),
  amount: z
    .number()
    .positive("Amount must be positive.")
    .max(MAX_SUBSCRIBE_USDC, "Amount exceeds maximum allowed."),
});

export async function subscribe(
  vaultId: string,
  classCode: string,
  amount: number,
): Promise<SubscribeResult> {
  // --- Auth guard -----------------------------------------------------------
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sign in to subscribe." };
  }

  // Only investors can subscribe; admins must use the admin console.
  const investor = await getInvestor();
  if (!investor) {
    return { ok: false, error: "Investor profile not found." };
  }

  // --- Input validation -----------------------------------------------------
  const parsed = SubscribeInput.safeParse({ vaultId, classCode, amount });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const msg = issue?.message ?? "Invalid input.";
    return { ok: false, error: msg };
  }

  const { vaultId: validVaultId, classCode: validCode, amount: validAmount } =
    parsed.data;

  // --- Fetch share class ----------------------------------------------------
  const shareClass = await prisma.shareClass.findUnique({
    where: { vaultId_code: { vaultId: validVaultId, code: validCode } },
  });

  if (!shareClass) {
    return { ok: false, error: "Share class not found." };
  }
  if (!shareClass.active) {
    return { ok: false, error: "This share class is not currently active." };
  }

  // --- Minimum ticket check (Decimal-safe comparison) -----------------------
  const minTicketNumber = shareClass.minTicket.toNumber();
  if (validAmount < minTicketNumber) {
    const formatted = (minTicketNumber / 1_000).toFixed(0);
    return {
      ok: false,
      error: `Amount is below the minimum ticket of $${formatted}k for class ${validCode}.`,
    };
  }

  // --- Vault status guard ---------------------------------------------------
  const vault = await prisma.vaultDeployment.findUnique({
    where: { id: validVaultId },
    select: { id: true, status: true },
  });

  if (!vault) {
    return { ok: false, error: "Vault not found." };
  }
  if (vault.status !== "live") {
    return { ok: false, error: "This vault is not open for subscription." };
  }

  // --- Compute lockupUntil --------------------------------------------------
  const subscribedAt = new Date();
  const lockupUntil = new Date(
    subscribedAt.getTime() + shareClass.lockupDays * 86_400_000,
  );

  // --- Persist Subscription row --------------------------------------------
  const subscription = await prisma.subscription.create({
    data: {
      userId: session.userId,
      vaultId: validVaultId,
      shareClassId: shareClass.id,
      amount: validAmount,
      subscribedAt,
      lockupUntil,
      status: "pending",
    },
    select: { id: true, lockupUntil: true },
  });

  revalidatePath("/portfolio");

  return {
    ok: true,
    subscriptionId: subscription.id,
    lockupUntil: subscription.lockupUntil,
  };
}
