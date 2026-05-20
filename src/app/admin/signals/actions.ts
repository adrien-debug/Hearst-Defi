"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { recordAdminAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ApproveSchema = z.object({
  eventId: z.string().min(1),
  signerWallet: z.string().min(1),
});

const RejectSchema = z.object({
  eventId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

const ExecuteSchema = z.object({
  eventId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Multisig threshold — default 2 distinct signers required
// ---------------------------------------------------------------------------

const REQUIRED_SIGNERS = 2;

// ---------------------------------------------------------------------------
// approveRebalance
// ---------------------------------------------------------------------------

export async function approveRebalance(
  eventId: string,
  signerWallet: string,
): Promise<void> {
  const admin = await requireAdmin();

  const parsed = ApproveSchema.safeParse({ eventId, signerWallet });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }

  try {
    const event = await prisma.rebalanceEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new Error(`RebalanceEvent ${eventId} not found`);
    if (event.status !== "pending") {
      throw new Error(
        `Cannot approve a signal with status "${event.status}". Expected "pending".`,
      );
    }

    const currentSigners: string[] = JSON.parse(event.approvedBy) as string[];

    // Idempotent: skip if signer already present
    if (currentSigners.includes(signerWallet)) {
      logger.info("[signals] signer already present — idempotent", {
        eventId,
        signerWallet,
      });
      return;
    }

    const updatedSigners = [...currentSigners, signerWallet];
    const thresholdReached = updatedSigners.length >= REQUIRED_SIGNERS;

    const before = { status: event.status, approvedBy: event.approvedBy };

    const updated = await prisma.rebalanceEvent.update({
      where: { id: eventId },
      data: {
        approvedBy: JSON.stringify(updatedSigners),
        status: thresholdReached ? "approved" : "pending",
      },
    });

    const after = { status: updated.status, approvedBy: updated.approvedBy };

    await recordAdminAudit({
      actorWallet: admin.walletAddress ?? admin.userId,
      action: thresholdReached ? "rebalance.approved" : "rebalance.approve.partial",
      entityType: "RebalanceEvent",
      entityId: eventId,
      before,
      after,
    });

    logger.info("[signals] approve", {
      eventId,
      signerWallet,
      signersCount: updatedSigners.length,
      thresholdReached,
      newStatus: updated.status,
    });

    revalidatePath("/admin/signals");
    revalidatePath("/proof-center");
  } catch (err) {
    logger.error("approveRebalance failed", { eventId }, err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// rejectRebalance
// ---------------------------------------------------------------------------

export async function rejectRebalance(
  eventId: string,
  reason: string,
): Promise<void> {
  const admin = await requireAdmin();

  const parsed = RejectSchema.safeParse({ eventId, reason });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }

  try {
    const event = await prisma.rebalanceEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new Error(`RebalanceEvent ${eventId} not found`);
    if (event.status !== "pending" && event.status !== "approved") {
      throw new Error(
        `Cannot reject a signal with status "${event.status}".`,
      );
    }

    const before = { status: event.status };

    const updated = await prisma.rebalanceEvent.update({
      where: { id: eventId },
      data: {
        status: "cancelled",
        // Store the rejection reason in triggerText suffix (no dedicated col at MVP)
        triggerText: `${event.triggerText} [REJECTED: ${reason}]`,
      },
    });

    await recordAdminAudit({
      actorWallet: admin.walletAddress ?? admin.userId,
      action: "rebalance.rejected",
      entityType: "RebalanceEvent",
      entityId: eventId,
      before,
      after: { status: updated.status, reason },
    });

    logger.info("[signals] reject", { eventId, reason });

    revalidatePath("/admin/signals");
    revalidatePath("/proof-center");
  } catch (err) {
    logger.error("rejectRebalance failed", { eventId }, err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// executeRebalance
// ---------------------------------------------------------------------------

export async function executeRebalance(eventId: string): Promise<void> {
  const admin = await requireAdmin();

  const parsed = ExecuteSchema.safeParse({ eventId });
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }

  try {
    const event = await prisma.rebalanceEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new Error(`RebalanceEvent ${eventId} not found`);
    if (event.status !== "approved") {
      throw new Error(
        `Cannot execute a signal with status "${event.status}". Expected "approved".`,
      );
    }

    const before = { status: event.status };
    const now = new Date();

    const updated = await prisma.rebalanceEvent.update({
      where: { id: eventId },
      data: {
        status: "executed",
        executedAt: now,
      },
    });

    await recordAdminAudit({
      actorWallet: admin.walletAddress ?? admin.userId,
      action: "rebalance.executed",
      entityType: "RebalanceEvent",
      entityId: eventId,
      before,
      after: { status: updated.status, executedAt: now },
    });

    logger.info("[signals] execute", { eventId, executedAt: now });

    revalidatePath("/admin/signals");
    revalidatePath("/proof-center");
  } catch (err) {
    logger.error("executeRebalance failed", { eventId }, err);
    throw err;
  }
}
