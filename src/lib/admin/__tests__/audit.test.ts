import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the module under test
vi.mock("@/lib/db", () => ({
  prisma: {
    adminAudit: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { recordAdminAudit } from "../audit";
import { prisma } from "@/lib/db";

describe("recordAdminAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls prisma.adminAudit.create with correct data and serializes diff as JSON", async () => {
    const before = { status: "draft" };
    const after = { status: "review" };

    await recordAdminAudit({
      actorWallet: "0xDeAdBeEf",
      action: "vault.submitForReview",
      entityType: "VaultDeployment",
      entityId: "clxyzabc123",
      before,
      after,
      ip: "127.0.0.1",
      userAgent: "Mozilla/5.0",
    });

    expect(prisma.adminAudit.create).toHaveBeenCalledOnce();
    const callArg = vi.mocked(prisma.adminAudit.create).mock.calls[0]![0];
    expect(callArg.data.actorWallet).toBe("0xDeAdBeEf");
    expect(callArg.data.action).toBe("vault.submitForReview");
    expect(callArg.data.entityType).toBe("VaultDeployment");
    expect(callArg.data.entityId).toBe("clxyzabc123");
    expect(callArg.data.ip).toBe("127.0.0.1");
    expect(callArg.data.userAgent).toBe("Mozilla/5.0");

    const parsed = JSON.parse(callArg.data.diff) as { before: unknown; after: unknown };
    expect(parsed.before).toEqual(before);
    expect(parsed.after).toEqual(after);
  });

  it("defaults before/after to null when omitted", async () => {
    await recordAdminAudit({
      actorWallet: "0xABCD",
      action: "rebalance.approve",
      entityType: "RebalanceEvent",
      entityId: "clxyzdef456",
    });

    const callArg = vi.mocked(prisma.adminAudit.create).mock.calls[0]![0];
    const parsed = JSON.parse(callArg.data.diff) as { before: unknown; after: unknown };
    expect(parsed.before).toBeNull();
    expect(parsed.after).toBeNull();
    expect(callArg.data.ip).toBeNull();
    expect(callArg.data.userAgent).toBeNull();
  });
});
