/**
 * Governance proposal state machine — pure functions, no I/O, no DB, no fetch.
 *
 * States:
 *   DRAFT → SIGNING → QUEUED → TIMELOCK → EXECUTABLE → EXECUTED
 *                   ↘ REJECTED
 *                                         ↘ CANCELLED
 *                                                       ↘ EXPIRED
 */

/**
 * Default timelock delay in hours applied when a proposal enters TIMELOCK state
 * and the per-proposal `timelockHours` field is not available.
 *
 * Used by TimelockCountdown and any consumer that needs a fallback constant.
 */
export const TIMELOCK_DELAY_HOURS = 48;

export type ProposalState =
  | "DRAFT"
  | "SIGNING"
  | "QUEUED"
  | "TIMELOCK"
  | "EXECUTABLE"
  | "EXECUTED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED";

/** Valid directed transitions allowed by the state machine. */
const VALID_TRANSITIONS: ReadonlyMap<ProposalState, ReadonlySet<ProposalState>> = new Map([
  ["DRAFT", new Set<ProposalState>(["SIGNING"])],
  ["SIGNING", new Set<ProposalState>(["QUEUED", "REJECTED"])],
  ["QUEUED", new Set<ProposalState>(["TIMELOCK", "CANCELLED"])],
  ["TIMELOCK", new Set<ProposalState>(["EXECUTABLE", "CANCELLED"])],
  ["EXECUTABLE", new Set<ProposalState>(["EXECUTED", "EXPIRED"])],
  ["EXECUTED", new Set<ProposalState>()],
  ["CANCELLED", new Set<ProposalState>()],
  ["REJECTED", new Set<ProposalState>()],
  ["EXPIRED", new Set<ProposalState>()],
]);

/**
 * Returns true iff the transition `from → to` is permitted by the state machine.
 */
export function canTransition(from: ProposalState, to: ProposalState): boolean {
  const allowed = VALID_TRANSITIONS.get(from);
  if (allowed === undefined) return false;
  return allowed.has(to);
}

/** Minimal proposal shape needed by the pure state-machine functions. */
export interface ProposalCore {
  state: ProposalState;
  requiredSigners: number;
  cancelQuorum: number;
  timelockHours: number;
  graceWindowDays: number;
  submittedAt: Date | null;
  etaAt: Date | null;
}

/** Minimal signature shape needed by the pure state-machine functions. */
export interface SignatureCore {
  decision: "approve" | "reject" | "cancel";
}

/**
 * Given the current proposal + its signatures, returns the next state the
 * proposal should be in after a new signature has been added.
 *
 * Returns the *current* state if no threshold is crossed.
 */
export function nextStateAfterSignature(
  proposal: ProposalCore,
  signatures: SignatureCore[],
): ProposalState {
  const { state, requiredSigners, cancelQuorum } = proposal;

  const approvals = signatures.filter((s) => s.decision === "approve").length;
  const rejections = signatures.filter((s) => s.decision === "reject").length;
  const cancels = signatures.filter((s) => s.decision === "cancel").length;

  if (state === "SIGNING") {
    // reject quorum: 2 rejections (fixed per spec) moves to REJECTED
    if (rejections >= 2) return "REJECTED";
    // approve quorum reached → QUEUED
    if (approvals >= requiredSigners) return "QUEUED";
  }

  if (state === "QUEUED" || state === "TIMELOCK") {
    // cancel quorum
    if (cancels >= cancelQuorum) return "CANCELLED";
  }

  return state;
}

/**
 * Computes the timelock ETA: submittedAt + timelockHours.
 */
export function computeEta(submittedAt: Date, timelockHours: number): Date {
  return new Date(submittedAt.getTime() + timelockHours * 60 * 60 * 1000);
}

/**
 * Returns true if the proposal is past its grace window (etaAt + graceWindowDays)
 * and has not been executed yet.
 */
export function isExpired(proposal: ProposalCore, now: Date): boolean {
  if (proposal.state !== "EXECUTABLE") return false;
  if (!proposal.etaAt) return false;
  const expiry = new Date(
    proposal.etaAt.getTime() + proposal.graceWindowDays * 24 * 60 * 60 * 1000,
  );
  return now >= expiry;
}

/**
 * Returns true if the proposal's timelock has elapsed and it is ready to execute.
 */
export function isExecutable(proposal: ProposalCore, now: Date): boolean {
  if (proposal.state !== "TIMELOCK") return false;
  if (!proposal.etaAt) return false;
  return now >= proposal.etaAt;
}
