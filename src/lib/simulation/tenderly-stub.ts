/**
 * Tenderly fork simulation stub.
 *
 * STUB ONLY — no real Tenderly API calls are made.
 * Phase 2 integration requires a Tenderly account + project credentials
 * (TENDERLY_ACCESS_KEY, TENDERLY_ACCOUNT, TENDERLY_PROJECT env vars).
 *
 * The stub is deterministic:
 *   - gasUsedEstimate = 84231 (fixed)
 *   - gasCostUsdEstimate = 3.40 (fixed)
 *   - stateDiff = 1 mock slot derived from actionType
 *   - balanceDelta = [] (empty — governance actions don't move ETH)
 *   - reverts = [] — UNLESS actionType === "deliberateRevert"
 *   - events = [GovernanceExecuted(...)]
 *
 * Wiring to real Tenderly (P2):
 *   Replace the body of simulateProposal with:
 *     POST https://api.tenderly.co/api/v1/account/{account}/project/{project}/simulate
 *   Pass vaultAddress as `from`, calldata as `input`, and decode the response
 *   into SimulationResult using the same shape.
 */

import type { ProposalInput, SimulationResult } from "./types";

const MOCK_GAS_USED = 84_231;
const MOCK_GAS_COST_USD = 3.4;

/**
 * Simulate a governance proposal execution on a Tenderly fork.
 *
 * @param proposal - vault address, calldata, and action type
 * @returns deterministic SimulationResult
 */
export async function simulateProposal(
  proposal: ProposalInput,
): Promise<SimulationResult> {
  const { vaultAddress, calldata, actionType } = proposal;

  // Validate inputs (basic guards — real Tenderly call would reject too)
  if (!vaultAddress || !calldata) {
    throw new Error("simulateProposal: vaultAddress and calldata are required");
  }

  // Deliberate revert path (used in tests and demo UI)
  if (actionType === "deliberateRevert") {
    return {
      ok: false,
      gasUsedEstimate: MOCK_GAS_USED,
      gasCostUsdEstimate: MOCK_GAS_COST_USD,
      stateDiff: [],
      balanceDelta: [],
      reverts: [
        {
          reason: "GovernanceAction: execution reverted by stub",
          pc: 1337,
        },
      ],
      events: [],
    };
  }

  // Mock storage slot: represents a governance state update for this action
  const slotKey = `0x${actionType
    .split("")
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 64)
    .padEnd(64, "0")}`;

  // Simulate a timestamp-like "after" value (deterministic: 1_700_000_000 base)
  const mockTimestamp =
    1_700_000_000 + actionType.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  return {
    ok: true,
    gasUsedEstimate: MOCK_GAS_USED,
    gasCostUsdEstimate: MOCK_GAS_COST_USD,
    stateDiff: [
      {
        contract: vaultAddress,
        slot: slotKey,
        before:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        after: `0x${mockTimestamp.toString(16).padStart(64, "0")}`,
      },
    ],
    balanceDelta: [],
    reverts: [],
    events: [
      {
        name: "GovernanceExecuted",
        args: {
          opId: `0x${calldata.slice(2, 10).padStart(64, "0")}`,
          target: vaultAddress,
          selector: calldata.slice(0, 10),
          by: "0x000000000000000000000000000000000000dead",
        },
      },
    ],
  };
}
