// Off-chain mining attestation toolkit: build → sign → verify, with a digest
// that doubles as the on-chain `evidenceHash` for Phase 2 PoR publishing.
export type {
  AttestationPeriod,
  MiningAttestationPayload,
  SignedAttestation,
  VerificationReason,
  VerificationResult,
} from "./types";
export { canonicalize, digestOf } from "./canonical";
export { attestorAddress, signAttestation } from "./sign";
export { verifyAttestation } from "./verify";
export {
  parseAttestationPayload,
  verifyStoredAttestation,
  type StoredAttestation,
  type StoredVerificationReason,
  type StoredVerificationResult,
} from "./stored";

