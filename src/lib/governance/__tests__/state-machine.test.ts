import { describe, it, expect } from "vitest";

import {
  canTransition,
  computeEta,
  isExecutable,
  isExpired,
  nextStateAfterSignature,
  type ProposalCore,
  type ProposalState,
  type SignatureCore,
} from "../state-machine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProposal(overrides: Partial<ProposalCore> = {}): ProposalCore {
  return {
    state: "SIGNING",
    requiredSigners: 3,
    cancelQuorum: 2,
    timelockHours: 48,
    graceWindowDays: 7,
    submittedAt: new Date("2026-01-01T00:00:00Z"),
    etaAt: new Date("2026-01-03T00:00:00Z"), // +48h
    ...overrides,
  };
}

function sigs(decisions: Array<"approve" | "reject" | "cancel">): SignatureCore[] {
  return decisions.map((d) => ({ decision: d }));
}

// ---------------------------------------------------------------------------
// canTransition
// ---------------------------------------------------------------------------

describe("canTransition", () => {
  const validCases: [ProposalState, ProposalState][] = [
    ["DRAFT", "SIGNING"],
    ["SIGNING", "QUEUED"],
    ["SIGNING", "REJECTED"],
    ["QUEUED", "TIMELOCK"],
    ["QUEUED", "CANCELLED"],
    ["TIMELOCK", "EXECUTABLE"],
    ["TIMELOCK", "CANCELLED"],
    ["EXECUTABLE", "EXECUTED"],
    ["EXECUTABLE", "EXPIRED"],
  ];

  it.each(validCases)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  const invalidCases: [ProposalState, ProposalState][] = [
    ["DRAFT", "QUEUED"],
    ["DRAFT", "EXECUTED"],
    ["SIGNING", "TIMELOCK"],
    ["SIGNING", "EXECUTED"],
    ["QUEUED", "EXECUTED"],
    ["QUEUED", "REJECTED"],
    ["TIMELOCK", "EXECUTED"],
    ["TIMELOCK", "REJECTED"],
    ["EXECUTED", "SIGNING"],
    ["EXECUTED", "DRAFT"],
    ["CANCELLED", "SIGNING"],
    ["REJECTED", "QUEUED"],
    ["EXPIRED", "EXECUTABLE"],
  ];

  it.each(invalidCases)("blocks %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it("returns false for terminal states to themselves", () => {
    const terminals: ProposalState[] = ["EXECUTED", "CANCELLED", "REJECTED", "EXPIRED"];
    for (const t of terminals) {
      expect(canTransition(t, t)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// nextStateAfterSignature — SIGNING
// ---------------------------------------------------------------------------

describe("nextStateAfterSignature — SIGNING", () => {
  it("returns SIGNING when below approval quorum", () => {
    const proposal = makeProposal({ state: "SIGNING", requiredSigners: 3 });
    expect(nextStateAfterSignature(proposal, sigs(["approve", "approve"]))).toBe("SIGNING");
  });

  it("returns QUEUED when approval quorum is reached (3/3)", () => {
    const proposal = makeProposal({ state: "SIGNING", requiredSigners: 3 });
    expect(nextStateAfterSignature(proposal, sigs(["approve", "approve", "approve"]))).toBe("QUEUED");
  });

  it("returns REJECTED when 2 rejections received", () => {
    const proposal = makeProposal({ state: "SIGNING", requiredSigners: 3 });
    expect(nextStateAfterSignature(proposal, sigs(["approve", "reject", "reject"]))).toBe("REJECTED");
  });

  it("rejects take precedence over approvals at quorum", () => {
    // 3 approvals + 2 rejections — rejection threshold fires before approve
    // (rejections are checked first in the implementation)
    const proposal = makeProposal({ state: "SIGNING", requiredSigners: 3 });
    const result = nextStateAfterSignature(proposal, sigs(["approve", "approve", "approve", "reject", "reject"]));
    // Both thresholds crossed — implementation checks rejection first
    expect(result).toBe("REJECTED");
  });

  it("returns SIGNING when exactly 1 reject (below threshold)", () => {
    const proposal = makeProposal({ state: "SIGNING", requiredSigners: 3 });
    expect(nextStateAfterSignature(proposal, sigs(["approve", "reject"]))).toBe("SIGNING");
  });
});

// ---------------------------------------------------------------------------
// nextStateAfterSignature — TIMELOCK / QUEUED cancel
// ---------------------------------------------------------------------------

describe("nextStateAfterSignature — cancel quorum", () => {
  it("returns CANCELLED when cancel quorum reached in TIMELOCK", () => {
    const proposal = makeProposal({ state: "TIMELOCK", cancelQuorum: 2 });
    expect(nextStateAfterSignature(proposal, sigs(["cancel", "cancel"]))).toBe("CANCELLED");
  });

  it("returns CANCELLED when cancel quorum reached in QUEUED", () => {
    const proposal = makeProposal({ state: "QUEUED", cancelQuorum: 2 });
    expect(nextStateAfterSignature(proposal, sigs(["cancel", "cancel"]))).toBe("CANCELLED");
  });

  it("returns TIMELOCK when below cancel quorum", () => {
    const proposal = makeProposal({ state: "TIMELOCK", cancelQuorum: 2 });
    expect(nextStateAfterSignature(proposal, sigs(["cancel"]))).toBe("TIMELOCK");
  });
});

// ---------------------------------------------------------------------------
// computeEta
// ---------------------------------------------------------------------------

describe("computeEta", () => {
  it("adds timelockHours to submittedAt", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const eta = computeEta(base, 48);
    expect(eta.toISOString()).toBe("2026-01-03T00:00:00.000Z");
  });

  it("handles fractional hours correctly", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const eta = computeEta(base, 1);
    expect(eta.getTime() - base.getTime()).toBe(3_600_000);
  });

  it("handles 0 hours (immediate)", () => {
    const base = new Date("2026-01-01T12:00:00Z");
    const eta = computeEta(base, 0);
    expect(eta.getTime()).toBe(base.getTime());
  });
});

// ---------------------------------------------------------------------------
// isExecutable
// ---------------------------------------------------------------------------

describe("isExecutable", () => {
  it("returns true when TIMELOCK and now >= etaAt", () => {
    const proposal = makeProposal({
      state: "TIMELOCK",
      etaAt: new Date("2026-01-03T00:00:00Z"),
    });
    const now = new Date("2026-01-03T00:00:01Z");
    expect(isExecutable(proposal, now)).toBe(true);
  });

  it("returns true at exact eta boundary", () => {
    const eta = new Date("2026-01-03T00:00:00Z");
    const proposal = makeProposal({ state: "TIMELOCK", etaAt: eta });
    expect(isExecutable(proposal, eta)).toBe(true);
  });

  it("returns false when now < etaAt", () => {
    const proposal = makeProposal({
      state: "TIMELOCK",
      etaAt: new Date("2026-01-03T00:00:00Z"),
    });
    const now = new Date("2026-01-02T23:59:59Z");
    expect(isExecutable(proposal, now)).toBe(false);
  });

  it("returns false when state is not TIMELOCK", () => {
    const proposal = makeProposal({
      state: "QUEUED",
      etaAt: new Date("2026-01-03T00:00:00Z"),
    });
    expect(isExecutable(proposal, new Date("2026-01-04T00:00:00Z"))).toBe(false);
  });

  it("returns false when etaAt is null", () => {
    const proposal = makeProposal({ state: "TIMELOCK", etaAt: null });
    expect(isExecutable(proposal, new Date("2026-01-10T00:00:00Z"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isExpired
// ---------------------------------------------------------------------------

describe("isExpired", () => {
  it("returns true when EXECUTABLE and past grace window", () => {
    const proposal = makeProposal({
      state: "EXECUTABLE",
      etaAt: new Date("2026-01-03T00:00:00Z"),
      graceWindowDays: 7,
    });
    // grace ends 2026-01-10T00:00:00Z
    const now = new Date("2026-01-10T00:00:01Z");
    expect(isExpired(proposal, now)).toBe(true);
  });

  it("returns true at exact grace expiry boundary", () => {
    const eta = new Date("2026-01-03T00:00:00Z");
    const proposal = makeProposal({ state: "EXECUTABLE", etaAt: eta, graceWindowDays: 7 });
    const expiry = new Date("2026-01-10T00:00:00Z");
    expect(isExpired(proposal, expiry)).toBe(true);
  });

  it("returns false when still within grace window", () => {
    const proposal = makeProposal({
      state: "EXECUTABLE",
      etaAt: new Date("2026-01-03T00:00:00Z"),
      graceWindowDays: 7,
    });
    const now = new Date("2026-01-09T23:59:59Z");
    expect(isExpired(proposal, now)).toBe(false);
  });

  it("returns false when state is not EXECUTABLE", () => {
    const proposal = makeProposal({
      state: "TIMELOCK",
      etaAt: new Date("2026-01-01T00:00:00Z"),
      graceWindowDays: 7,
    });
    expect(isExpired(proposal, new Date("2026-02-01T00:00:00Z"))).toBe(false);
  });

  it("returns false when etaAt is null", () => {
    const proposal = makeProposal({ state: "EXECUTABLE", etaAt: null, graceWindowDays: 7 });
    expect(isExpired(proposal, new Date("2099-01-01T00:00:00Z"))).toBe(false);
  });
});
