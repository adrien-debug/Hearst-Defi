import "server-only";
import { prisma } from "@/lib/db";

export async function recordAdminAudit(params: {
  actorWallet: string;
  action: string; // "vault.submitForReview", "rebalance.approve", etc.
  entityType: string; // "VaultDeployment" | "RebalanceEvent" | "Distribution" | "ProjectionStudyRun"
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.adminAudit.create({
    data: {
      actorWallet: params.actorWallet,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      diff: JSON.stringify({
        before: params.before ?? null,
        after: params.after ?? null,
      }),
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}
