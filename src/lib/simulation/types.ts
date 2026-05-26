/**
 * Tenderly fork simulation types.
 *
 * SimulationResult mirrors the shape that the real Tenderly API would return.
 * The stub in `tenderly-stub.ts` returns deterministic mocks of this type.
 * Phase 2: swap the stub for a real Tenderly API call (requires Tenderly account).
 */

export type StateDiffEntry = {
  /** Contract address (checksummed or lowercase hex) */
  contract: string;
  /** Storage slot key */
  slot: string;
  /** Value before execution */
  before: string;
  /** Value after execution */
  after: string;
};

export type BalanceDeltaEntry = {
  /** Wallet / contract address */
  address: string;
  /** ETH balance before, in wei as a JS number (safe for display; BigInt for math) */
  before: number;
  /** ETH balance after */
  after: number;
};

export type RevertEntry = {
  /** Decoded revert reason string */
  reason: string;
  /** Program counter at revert */
  pc: number;
};

export type EventEntry = {
  /** Decoded event name */
  name: string;
  /** Decoded event arguments */
  args: Record<string, unknown>;
};

export type SimulationResult = {
  /** true = transaction succeeds, false = reverts */
  ok: boolean;
  /** Estimated gas units consumed */
  gasUsedEstimate: number;
  /** Estimated gas cost in USD */
  gasCostUsdEstimate: number;
  /** Storage slot changes detected in the fork */
  stateDiff: StateDiffEntry[];
  /** ETH balance changes (empty for most ERC-20 / governance operations) */
  balanceDelta: BalanceDeltaEntry[];
  /** Revert entries — non-empty when ok === false */
  reverts: RevertEntry[];
  /** Decoded events emitted during the simulation */
  events: EventEntry[];
};

export type ProposalInput = {
  /** Target vault contract address */
  vaultAddress: string;
  /** ABI-encoded calldata */
  calldata: string;
  /**
   * Human-readable action type used by the stub to derive deterministic mocks.
   * Pass "deliberateRevert" in tests to exercise the error path.
   */
  actionType: string;
};
