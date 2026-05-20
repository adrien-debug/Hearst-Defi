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
  signerWallet: z.string().min(1),
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
const pendingSigners = new Map<string, string[]>();

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
      walletAddress: pos.investor.walletAddress,
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

  const parsed = ConfirmSchema.safeParse({ period, signerWallet });
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

  // Accumulate signer
  const signers = pendingSigners.get(period) ?? [];
  if (!signers.includes(signerWallet)) {
    signers.push(signerWallet);
    pendingSigners.set(period, signers);
  }

  const signersCount = signers.length;

  logger.info("[distributions] confirm partial", {
    period,
    signerWallet,
    signersCount,
    required: REQUIRED_SIGNERS,
  });

  if (signersCount < REQUIRED_SIGNERS) {
    return { confirmed: false, signersCount, required: REQUIRED_SIGNERS };
  }

  // Threshold reached — execute
  const computed = await computeDistribution(period, totalUsdc);

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

      // Create one InvestorTransaction per recipient
      for (const r of computed.recipients) {
        const position = await tx.position.findFirst({
          where: { investorId: r.investorId, status: "active" },
          select: { id: true },
        });

        await tx.investorTransaction.create({
          data: {
            investorId: r.investorId,
            positionId: position?.id ?? null,
            type: "distribution",
            amountUsdc: r.payoutUsdc,
            occurredAt: new Date(),
          },
        });
      }

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
    revalidatePath("/proof-center");

    return { confirmed: true, signersCount, required: REQUIRED_SIGNERS };
  } catch (err) {
    logger.error("confirmDistribution failed", { period }, err);
    throw err;
  }
}
