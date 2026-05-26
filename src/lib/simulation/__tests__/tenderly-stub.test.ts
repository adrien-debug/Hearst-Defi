import { describe, it, expect } from "vitest";
import { simulateProposal } from "../tenderly-stub";

const MOCK_PROPOSAL = {
  vaultAddress: "0x1234567890abcdef1234567890abcdef12345678",
  calldata: "0xa9059cbb000000000000000000000000dead",
  actionType: "setFeeRecipient",
};

describe("simulateProposal — happy path", () => {
  it("returns a valid SimulationResult", async () => {
    const result = await simulateProposal(MOCK_PROPOSAL);

    expect(result.ok).toBe(true);
    expect(typeof result.gasUsedEstimate).toBe("number");
    expect(result.gasUsedEstimate).toBe(84_231);
    expect(typeof result.gasCostUsdEstimate).toBe("number");
    expect(result.gasCostUsdEstimate).toBeCloseTo(3.4, 2);
    expect(Array.isArray(result.stateDiff)).toBe(true);
    expect(Array.isArray(result.balanceDelta)).toBe(true);
    expect(Array.isArray(result.reverts)).toBe(true);
    expect(Array.isArray(result.events)).toBe(true);
  });

  it("stateDiff contains exactly 1 entry with correct contract address", async () => {
    const result = await simulateProposal(MOCK_PROPOSAL);

    expect(result.stateDiff).toHaveLength(1);
    const diff = result.stateDiff[0]!;
    expect(diff.contract).toBe(MOCK_PROPOSAL.vaultAddress);
    expect(diff.slot).toMatch(/^0x[0-9a-f]{64}$/);
    expect(diff.before).toMatch(/^0x0{64}$/);
    expect(diff.after).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("balanceDelta is empty for governance actions", async () => {
    const result = await simulateProposal(MOCK_PROPOSAL);
    expect(result.balanceDelta).toHaveLength(0);
  });

  it("reverts is empty when simulation succeeds", async () => {
    const result = await simulateProposal(MOCK_PROPOSAL);
    expect(result.reverts).toHaveLength(0);
  });

  it("emits one GovernanceExecuted event", async () => {
    const result = await simulateProposal(MOCK_PROPOSAL);

    expect(result.events).toHaveLength(1);
    const ev = result.events[0]!;
    expect(ev.name).toBe("GovernanceExecuted");
    expect(ev.args).toHaveProperty("opId");
    expect(ev.args).toHaveProperty("target");
    expect(ev.args).toHaveProperty("selector");
    expect(ev.args).toHaveProperty("by");
  });

  it("is deterministic — same input produces same output", async () => {
    const r1 = await simulateProposal(MOCK_PROPOSAL);
    const r2 = await simulateProposal(MOCK_PROPOSAL);

    expect(r1).toEqual(r2);
  });
});

describe("simulateProposal — deliberateRevert action", () => {
  it("returns ok=false when actionType is deliberateRevert", async () => {
    const result = await simulateProposal({
      ...MOCK_PROPOSAL,
      actionType: "deliberateRevert",
    });

    expect(result.ok).toBe(false);
  });

  it("reverts array has at least one entry", async () => {
    const result = await simulateProposal({
      ...MOCK_PROPOSAL,
      actionType: "deliberateRevert",
    });

    expect(result.reverts.length).toBeGreaterThan(0);
    const rev = result.reverts[0]!;
    expect(typeof rev.reason).toBe("string");
    expect(rev.reason.length).toBeGreaterThan(0);
    expect(typeof rev.pc).toBe("number");
  });

  it("no events emitted on revert", async () => {
    const result = await simulateProposal({
      ...MOCK_PROPOSAL,
      actionType: "deliberateRevert",
    });

    expect(result.events).toHaveLength(0);
  });

  it("gas estimates are still returned on revert", async () => {
    const result = await simulateProposal({
      ...MOCK_PROPOSAL,
      actionType: "deliberateRevert",
    });

    expect(result.gasUsedEstimate).toBe(84_231);
    expect(result.gasCostUsdEstimate).toBeCloseTo(3.4, 2);
  });
});

describe("simulateProposal — input validation", () => {
  it("throws when vaultAddress is empty", async () => {
    await expect(
      simulateProposal({ ...MOCK_PROPOSAL, vaultAddress: "" }),
    ).rejects.toThrow("vaultAddress and calldata are required");
  });

  it("throws when calldata is empty", async () => {
    await expect(
      simulateProposal({ ...MOCK_PROPOSAL, calldata: "" }),
    ).rejects.toThrow("vaultAddress and calldata are required");
  });
});
