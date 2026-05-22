"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { recordAdminAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const PeriodSchema = z.string().regex(/^\d{4}-\d{2}$/, {
  message: "Period must be in YYYY-MM format, e.g. 2026-05",
});

const ComputeSchema = z.object({
  period: PeriodSchema,
  totalUsdc: z.number().positive(),
});

const ConfirmSchema = z.object({
  period: PeriodSchema,
  signerWallet: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address"),
  totalUsdc: z.number().positive(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DistributionRecipient {
  investorId: string;
  walletAddress: string;
  sharesPct: number;
  payoutUsdc: number;
}

export interface ComputeDistributionResult {
  period: string;
  totalUsdc: number;
  recipients: DistributionRecipient[];
}

// ---------------------------------------------------------------------------
// Multisig threshold
// ---------------------------------------------------------------------------

const REQUIRED_SIGNERS = 2;

// State key for multisig accumulation per period
// We track pending confirmations in-memory (MVP: process restarts reset it —
// acceptable for admin ops that complete within a single session).
// Production: persist in a table row like DistributionApproval.
//
// Each entry stores:
//   - signers: wallets that have signed so far
//   - totalUsdc: the amount locked in by the FIRST signer (reference amount).
//     Any subsequent signer submitting a different amount is REJECTED — the
//     multisig must protect the amount, not just the count.
interface PendingConfirmation {
  signers: string[];
  totalUsdc: number;
}
const pendingSigners = new Map<string, PendingConfirmation>();

// ---------------------------------------------------------------------------
// computeDistribution — pure dry-run, no DB writes
// ---------------------------------------------------------------------------

export async function computeDistribution(
  period: string,
  totalUsdc: number,
): Promise<ComputeDistributionResult> {
  await requireAdmin();

  const parsed = ComputeSchema.safeParse({ period, totalUsdc });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }

  const activePositions = await prisma.position.findMany({
    where: { status: "active" },
    include: { investor: { select: { id: true, walletAddress: true } } },
  });

  if (activePositions.length === 0) {
    return { period, totalUsdc, recipients: [] };
  }

  // Sum total principal across all active positions
  const totalPrincipal = activePositions.reduce(
    (acc, p) => acc + p.principalUsdc.toNumber(),
    0,
  );

  if (totalPrincipal === 0) {
    return { period, totalUsdc, recipients: [] };
  }

  const recipients: DistributionRecipient[] = activePositions.map((pos) => {
    const principal = pos.principalUsdc.toNumber();
    const sharesPct = (principal / totalPrincipal) * 100;
    const payoutUsdc = (principal / totalPrincipal) * totalUsdc;
    return {
      investorId: pos.investorId,
      // walletAddress is nullable now (set only when the investor connects a
      // wallet for payment). Empty string = no wallet on file yet.
      walletAddress: pos.investor.walletAddress ?? "",
      sharesPct: Math.round(sharesPct * 10000) / 10000,
      payoutUsdc: Math.round(payoutUsdc * 100) / 100,
    };
  });

  logger.info("[distributions] compute dry-run", {
    period,
    totalUsdc,
    recipientsCount: recipients.length,
    totalPrincipal,
  });

  return { period, totalUsdc, recipients };
}

// ---------------------------------------------------------------------------
// confirmDistribution — multisig, creates Distribution + InvestorTransaction rows
// ---------------------------------------------------------------------------

export async function confirmDistribution(
  period: string,
  signerWallet: string,
  totalUsdc: number,
): Promise<{ confirmed: boolean; signersCount: number; required: number }> {
  const admin = await requireAdmin();

  const parsed = ConfirmSchema.safeParse({ period, signerWallet, totalUsdc });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }

  // Check if a Distribution already exists for this period
  const existing = await prisma.distribution.findFirst({
    where: { period },
  });
  if (existing) {
    throw new Error(
      `Distribution for period "${period}" has already been confirmed.`,
    );
  }

  // Accumulate signer — amount is locked in by the first signer
  const pending = pendingSigners.get(period);

  if (pending === undefined) {
    // First signer: initialise and lock in the reference amount
    pendingSigners.set(period, { signers: [signerWallet], totalUsdc });
  } else {
    // Subsequent signer: reject if the submitted amount differs from reference
    if (totalUsdc !== pending.totalUsdc) {
      throw new Error(
        `Distribution amount mismatch for period "${period}": ` +
          `first signer approved $${pending.totalUsdc}, this signer submitted $${totalUsdc}. ` +
          `All signers must approve the same amount.`,
      );
    }
    if (!pending.signers.includes(signerWallet)) {
      pending.signers.push(signerWallet);
    }
  }

  // Re-read from the map so the rest of the function always uses the reference amount
  const confirmed = pendingSigners.get(period)!;
  const signers = confirmed.signers;
  const signersCount = signers.length;
  // Use the locked-in reference amount, not the caller's argument
  const lockedUsdc = confirmed.totalUsdc;

  logger.info("[distributions] confirm partial", {
    period,
    signerWallet,
    signersCount,
    required: REQUIRED_SIGNERS,
  });

  if (signersCount < REQUIRED_SIGNERS) {
    return { confirmed: false, signersCount, required: REQUIRED_SIGNERS };
  }

  // Threshold reached — execute using the REFERENCE amount (first signer's)
  const computed = await computeDistribution(period, lockedUsdc);

  try {
    await prisma.$transaction(async (tx) => {
      const distribution = await tx.distribution.create({
        data: {
          distributedAt: new Date(),
          amountUsdc: computed.totalUsdc,
          recipientsCount: computed.recipients.length,
          period,
        },
      });

      // Create one InvestorTransaction per recipient — single batch, no N+1.
      // Fetch all active positions for the affected investors in one query, then
      // build a Map so each recipient gets the correct positionId (or null when
      // no active position exists, matching the original per-row behaviour).
      const investorIds = computed.recipients.map((r) => r.investorId);

      const activePositions = await tx.position.findMany({
        where: { investorId: { in: investorIds }, status: "active" },
        select: { id: true, investorId: true },
      });

      // When multiple active positions exist per investor (shouldn't happen at
      // MVP but defensive), keep the first one found — same as findFirst would.
      const positionByInvestor = new Map<string, string>();
      for (const pos of activePositions) {
        if (!positionByInvestor.has(pos.investorId)) {
          positionByInvestor.set(pos.investorId, pos.id);
        }
      }

      const now = new Date();
      await tx.investorTransaction.createMany({
        data: computed.recipients.map((r) => ({
          investorId: r.investorId,
          positionId: positionByInvestor.get(r.investorId) ?? null,
          type: "distribution",
          amountUsdc: r.payoutUsdc,
          occurredAt: now,
        })),
      });

      await recordAdminAudit({
        actorWallet: admin.walletAddress ?? admin.userId,
        action: "distribution.confirmed",
        entityType: "Distribution",
        entityId: distribution.id,
        before: null,
        after: {
          period,
          totalUsdc: computed.totalUsdc,
          recipientsCount: computed.recipients.length,
          signers: signers.slice(),
        },
      });
    });

    // Clear the pending signers for this period
    pendingSigners.delete(period);

    logger.info("[distributions] confirmed", {
      period,
      totalUsdc: computed.totalUsdc,
      recipientsCount: computed.recipients.length,
    });

    revalidatePath("/admin/distributions");
    revalidatePath("/admin/proof-center");

    return { confirmed: true, signersCount, required: REQUIRED_SIGNERS };
  } catch (err) {
    logger.error("confirmDistribution failed", { period }, err);
    throw err;
  }
}
