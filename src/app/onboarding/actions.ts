"use server";

import { prisma } from "@/lib/db";

/**
 * markKycComplete
 *
 * Server Action called by the Persona webhook when an inquiry reaches a
 * terminal "completed" or "approved" status.
 *
 * Looks up the matching KycEvent row to resolve the `userId` (= Persona
 * referenceId), then flips `Investor.kycStatus` to `"approved"`.
 *
 * Idempotent: calling multiple times for the same inquiryId is safe.
 */
export async function markKycComplete(inquiryId: string): Promise<void> {
  if (!inquiryId || inquiryId.trim() === "") {
    throw new Error("markKycComplete: inquiryId must be a non-empty string");
  }

  // Resolve the userId from the most recent KycEvent for this inquiry.
  const event = await prisma.kycEvent.findFirst({
    where: { inquiryId },
    orderBy: { receivedAt: "desc" },
  });

  if (!event) {
    // Webhook may not have been persisted yet in edge cases — log and bail.
    console.warn(
      `[markKycComplete] No KycEvent found for inquiryId=${inquiryId}`,
    );
    return;
  }

  const userId = event.userId;
  if (!userId || userId === "unknown") {
    console.warn(
      `[markKycComplete] inquiryId=${inquiryId} has no resolvable userId — skipping Investor update`,
    );
    return;
  }

  // Update kycStatus on the Investor row (keyed by User.id = userId).
  await prisma.investor.updateMany({
    where: {
      user: { id: userId },
      kycStatus: { not: "approved" }, // skip if already approved
    },
    data: { kycStatus: "approved" },
  });
}
