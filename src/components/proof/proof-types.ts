import type { ProofItem, ProofType } from "@/lib/proof-center-types";
import type { OnChainEvent } from "@/lib/chain/event-logger";
import type { OnChainAttestation } from "@/lib/chain/por-registry";

/**
 * Discriminated union covering on-chain events, on-chain PoR attestations,
 * and the off-chain "paper" proofs typed by `src/lib/proof-center-types`.
 *
 * The Proof Center grid renders all three through a single `<ProofCard>`.
 */
export type UnifiedProof =
  | (ProofItem & { source: "paper" })
  | { source: "on-chain"; kind: "event"; data: OnChainEvent }
  | { source: "on-chain"; kind: "attestation"; data: OnChainAttestation };

export function paperProofKey(p: ProofItem): string {
  return `paper:${p.id}`;
}

export function onChainEventKey(e: OnChainEvent): string {
  return `chain:event:${e.eventId.toString()}`;
}

export function onChainAttestationKey(a: OnChainAttestation): string {
  return `chain:attestation:${a.attestationId.toString()}`;
}

/**
 * Map an on-chain proof onto the existing client-side `FilterValue` taxonomy.
 *  - PoR attestations → "mining_attestation" (they pin mining + AUM evidence)
 *  - EventLogger events → custody-ish: we surface them under "custody" for now
 *    because they live in the same operational stream.
 */
export function unifiedProofType(proof: UnifiedProof): ProofType {
  if (proof.source === "paper") return proof.proofType;
  if (proof.kind === "attestation") return "mining_attestation";
  return "custody";
}
