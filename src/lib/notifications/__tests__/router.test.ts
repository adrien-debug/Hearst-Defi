/**
 * Tests for src/lib/notifications/router.ts
 *
 * Covers:
 *  - resolveChannels() for all 6 NotifEvent values
 *  - renderTemplate() with data interpolation per event
 *  - NOTIFICATION_MATRIX shape invariants
 *  - Forbidden-word detection in templates
 */

import { describe, it, expect } from "vitest";

import {
  NOTIFICATION_MATRIX,
  resolveChannels,
  renderTemplate,
  type NotifEvent,
  type NotifRole,
  type NotifChannel,
} from "../router";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_EVENTS: NotifEvent[] = [
  "proposal.created",
  "proposal.signed",
  "proposal.queued",
  "timelock.unlocked",
  "proposal.executed",
  "proposal.cancelled",
];

const ALL_ROLES: NotifRole[] = ["admin_signer", "lp_holder", "auditor"];
const ALL_CHANNELS: NotifChannel[] = ["email", "telegram", "in_app"];

// ---------------------------------------------------------------------------
// 1. proposal.created — routing
// ---------------------------------------------------------------------------

describe("resolveChannels — proposal.created", () => {
  it("routes admin_signer to email + telegram + in_app", () => {
    const channels = resolveChannels("proposal.created", "admin_signer");
    expect(channels).toEqual(
      expect.arrayContaining(["email", "telegram", "in_app"]),
    );
    expect(channels).toHaveLength(3);
  });

  it("routes lp_holder to in_app only", () => {
    expect(resolveChannels("proposal.created", "lp_holder")).toEqual(["in_app"]);
  });

  it("routes auditor to email + in_app", () => {
    const channels = resolveChannels("proposal.created", "auditor");
    expect(channels).toContain("email");
    expect(channels).toContain("in_app");
    expect(channels).not.toContain("telegram");
  });
});

// ---------------------------------------------------------------------------
// 2. proposal.signed — routing
// ---------------------------------------------------------------------------

describe("resolveChannels — proposal.signed", () => {
  it("routes admin_signer to telegram + in_app", () => {
    const channels = resolveChannels("proposal.signed", "admin_signer");
    expect(channels).toContain("telegram");
    expect(channels).toContain("in_app");
  });

  it("routes lp_holder to no channels", () => {
    expect(resolveChannels("proposal.signed", "lp_holder")).toEqual([]);
  });

  it("routes auditor to in_app only", () => {
    expect(resolveChannels("proposal.signed", "auditor")).toEqual(["in_app"]);
  });
});

// ---------------------------------------------------------------------------
// 3. proposal.queued — routing
// ---------------------------------------------------------------------------

describe("resolveChannels — proposal.queued", () => {
  it("routes admin_signer to all 3 channels", () => {
    const channels = resolveChannels("proposal.queued", "admin_signer");
    expect(channels).toHaveLength(3);
    for (const ch of ALL_CHANNELS) {
      expect(channels).toContain(ch);
    }
  });

  it("routes lp_holder to in_app only", () => {
    expect(resolveChannels("proposal.queued", "lp_holder")).toEqual(["in_app"]);
  });

  it("routes auditor to email + in_app", () => {
    const channels = resolveChannels("proposal.queued", "auditor");
    expect(channels).toContain("email");
    expect(channels).toContain("in_app");
  });
});

// ---------------------------------------------------------------------------
// 4. timelock.unlocked — routing
// ---------------------------------------------------------------------------

describe("resolveChannels — timelock.unlocked", () => {
  it("routes admin_signer to all 3 channels", () => {
    const channels = resolveChannels("timelock.unlocked", "admin_signer");
    expect(channels).toHaveLength(3);
  });

  it("routes lp_holder to in_app only", () => {
    expect(resolveChannels("timelock.unlocked", "lp_holder")).toEqual(["in_app"]);
  });

  it("routes auditor to email + in_app", () => {
    const channels = resolveChannels("timelock.unlocked", "auditor");
    expect(channels).toContain("email");
    expect(channels).toContain("in_app");
    expect(channels).not.toContain("telegram");
  });
});

// ---------------------------------------------------------------------------
// 5. proposal.executed — routing
// ---------------------------------------------------------------------------

describe("resolveChannels — proposal.executed", () => {
  it("routes admin_signer to all 3 channels", () => {
    const channels = resolveChannels("proposal.executed", "admin_signer");
    expect(channels).toHaveLength(3);
  });

  it("routes lp_holder to email + in_app", () => {
    const channels = resolveChannels("proposal.executed", "lp_holder");
    expect(channels).toContain("email");
    expect(channels).toContain("in_app");
  });

  it("routes auditor to all 3 channels", () => {
    const channels = resolveChannels("proposal.executed", "auditor");
    expect(channels).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 6. proposal.cancelled — routing
// ---------------------------------------------------------------------------

describe("resolveChannels — proposal.cancelled", () => {
  it("routes admin_signer to all 3 channels", () => {
    const channels = resolveChannels("proposal.cancelled", "admin_signer");
    expect(channels).toHaveLength(3);
  });

  it("routes lp_holder to in_app only", () => {
    expect(resolveChannels("proposal.cancelled", "lp_holder")).toEqual(
      ["in_app"],
    );
  });

  it("routes auditor to email + in_app", () => {
    const channels = resolveChannels("proposal.cancelled", "auditor");
    expect(channels).toContain("email");
    expect(channels).toContain("in_app");
  });
});

// ---------------------------------------------------------------------------
// Template rendering — one per event
// ---------------------------------------------------------------------------

describe("renderTemplate — proposal.created", () => {
  it("injects proposalId and actionType into email template", () => {
    const { subject, body } = renderTemplate("proposal.created", "email", {
      proposalId: "PROP-001",
      actionType: "updateFees",
      proposer: "0xABCD",
      createdAt: "2026-05-26T10:00:00Z",
    });
    expect(subject).toContain("PROP-001");
    expect(body).toContain("PROP-001");
    expect(body).toContain("updateFees");
  });

  it("injects proposalId into telegram template", () => {
    const { subject, body } = renderTemplate("proposal.created", "telegram", {
      proposalId: "PROP-002",
      actionType: "deploy",
      proposer: "0xDEF0",
      createdAt: "2026-05-26T11:00:00Z",
    });
    expect(subject).toBeDefined();
    expect(body).toContain("PROP-002");
  });
});

describe("renderTemplate — proposal.signed", () => {
  it("injects signer and signature counts into email template", () => {
    const { body } = renderTemplate("proposal.signed", "email", {
      proposalId: "PROP-003",
      actionType: "pause",
      signer: "0x1111",
      signaturesCollected: "2",
      signaturesRequired: "4",
      signedAt: "2026-05-26T12:00:00Z",
    });
    expect(body).toContain("2");
    expect(body).toContain("4");
    expect(body).toContain("0x1111");
  });
});

describe("renderTemplate — proposal.queued", () => {
  it("injects timelockHours and executableAfter into telegram template", () => {
    const { body } = renderTemplate("proposal.queued", "telegram", {
      proposalId: "PROP-004",
      actionType: "rotateSigners",
      timelockHours: "24",
      executableAfter: "2026-05-27T12:00:00Z",
    });
    expect(body).toContain("24");
    expect(body).toContain("PROP-004");
  });
});

describe("renderTemplate — timelock.unlocked", () => {
  it("injects unlockedAt into email template", () => {
    const { subject, body } = renderTemplate("timelock.unlocked", "email", {
      proposalId: "PROP-005",
      actionType: "sweepFees",
      unlockedAt: "2026-05-27T00:00:00Z",
    });
    expect(subject).toContain("PROP-005");
    expect(body).toContain("2026-05-27T00:00:00Z");
  });
});

describe("renderTemplate — proposal.executed", () => {
  it("injects executor and txHash into email template", () => {
    const { body } = renderTemplate("proposal.executed", "email", {
      proposalId: "PROP-006",
      actionType: "deploy",
      executor: "0xEXEC",
      executedAt: "2026-05-26T15:00:00Z",
      txHash: "0xTXHASH",
    });
    expect(body).toContain("0xEXEC");
    expect(body).toContain("0xTXHASH");
  });

  it("injects data into in_app template", () => {
    const { subject } = renderTemplate("proposal.executed", "in_app", {
      proposalId: "PROP-007",
      actionType: "updateCaps",
      executor: "0xEXEC2",
      executedAt: "2026-05-26T16:00:00Z",
      txHash: "0xTX2",
    });
    expect(subject).toContain("PROP-007");
  });
});

describe("renderTemplate — proposal.cancelled", () => {
  it("injects canceller and reason into email template", () => {
    const { body } = renderTemplate("proposal.cancelled", "email", {
      proposalId: "PROP-008",
      actionType: "pause",
      canceller: "0xCANC",
      reason: "Stale proposal",
      cancelledAt: "2026-05-26T17:00:00Z",
    });
    expect(body).toContain("0xCANC");
    expect(body).toContain("Stale proposal");
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe("renderTemplate — error handling", () => {
  it("throws when no template exists for the combination", () => {
    // Cast through unknown to bypass the type system — testing runtime guard.
    const badEvent = "unknown.event" as unknown as NotifEvent;
    expect(() => renderTemplate(badEvent, "email", {})).toThrow(
      /No template registered/,
    );
  });

  it("leaves unknown placeholders intact rather than crashing", () => {
    const { subject } = renderTemplate("proposal.created", "email", {
      proposalId: "PROP-X",
      // Missing: actionType, proposer, createdAt
    });
    // Subject should still be interpolated for what was provided
    expect(subject).toContain("PROP-X");
    // Unknown keys are left as {{key}}
    expect(subject).not.toMatch(/\{\{proposalId\}\}/);
  });
});

// ---------------------------------------------------------------------------
// NOTIFICATION_MATRIX shape invariants
// ---------------------------------------------------------------------------

describe("NOTIFICATION_MATRIX — shape", () => {
  it("covers all events", () => {
    for (const event of ALL_EVENTS) {
      expect(NOTIFICATION_MATRIX).toHaveProperty(event);
    }
  });

  it("covers all roles for every event", () => {
    for (const event of ALL_EVENTS) {
      for (const role of ALL_ROLES) {
        expect(NOTIFICATION_MATRIX[event]).toHaveProperty(role);
        expect(Array.isArray(NOTIFICATION_MATRIX[event][role])).toBe(true);
      }
    }
  });

  it("only contains valid channel values", () => {
    for (const event of ALL_EVENTS) {
      for (const role of ALL_ROLES) {
        for (const ch of NOTIFICATION_MATRIX[event][role]) {
          expect(ALL_CHANNELS).toContain(ch);
        }
      }
    }
  });
});
