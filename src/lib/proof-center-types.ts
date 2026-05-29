/**
 * Proof Center view-model types.
 *
 * Display contracts for proof rows (mining attestation, custody, audit,
 * methodology). Live data is loaded from Prisma in `src/lib/data/proofs.ts`;
 * these types describe the shape that loader returns to the UI. Pure types —
 * no runtime.
 */

export type ProofType =
  | "mining_attestation"
  | "custody"
  | "audit"
  | "methodology";

export interface ProofItem {
  id: string;
  proofType: ProofType;
  period: string | null;
  title: string;
  hash: string;
  uri: string;
  postedAt: string;
  postedBy: string;
  txHash: string | null;
  /** Attestor address for signed proofs; null/undefined when unsigned. */
  signer?: string | null;
  /**
   * End-to-end signature check (payload → digest → signer) for mining
   * attestations. `null` when the proof carries no signature.
   */
  attestationVerified?: boolean | null;
}
