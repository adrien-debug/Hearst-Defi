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
export { attestorAddress, signAttestation, MOCK_ATTESTOR_PRIVATE_KEY } from "./sign";
export { verifyAttestation } from "./verify";
export {
  parseAttestationPayload,
  verifyStoredAttestation,
  type StoredAttestation,
} from "./stored";
export {
  buildMockAttestation,
  signMockAttestation,
  MOCK_ATTESTOR_ADDRESS,
} from "./mock";
