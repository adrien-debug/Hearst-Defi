import "server-only";

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

const PROOFS: ProofItem[] = [
  {
    id: "ma-2026-04",
    proofType: "mining_attestation",
    period: "2026-04",
    title: "April 2026 mining attestation",
    hash: "0xab12cd34ef5678901234567890abcdef1234567890abcdef1234567890abf9c3",
    uri: "ipfs://bafybeib2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8",
    postedAt: "2026-05-02T09:14:00Z",
    postedBy: "Multisig 3/5 · ops@hearst",
    txHash: null,
  },
  {
    id: "ma-2026-03",
    proofType: "mining_attestation",
    period: "2026-03",
    title: "March 2026 mining attestation",
    hash: "0x71f2a9c8e4b6d7531fa2c4d5e6f70819203a4b5c6d7e8f90a1b2c3d4e5f6a7b8",
    uri: "ipfs://bafybeih4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j1",
    postedAt: "2026-04-03T11:22:00Z",
    postedBy: "Multisig 3/5 · ops@hearst",
    txHash: null,
  },
  {
    id: "ma-2026-02",
    proofType: "mining_attestation",
    period: "2026-02",
    title: "February 2026 mining attestation",
    hash: "0x4c8d2f1a3b5e7c9d0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e",
    uri: "ipfs://bafybeie7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5",
    postedAt: "2026-03-04T10:01:00Z",
    postedBy: "Multisig 3/5 · ops@hearst",
    txHash: null,
  },
  {
    id: "cust-2026-04",
    proofType: "custody",
    period: "2026-04",
    title: "Custody proof-of-reserves snapshot · April 2026",
    hash: "0x9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0",
    uri: "https://por.hearst.io/snapshots/2026-04-30.json",
    postedAt: "2026-05-01T00:05:00Z",
    postedBy: "Fireblocks signer · custody@hearst",
    txHash: null,
  },
  {
    id: "cust-2026-03",
    proofType: "custody",
    period: "2026-03",
    title: "Custody proof-of-reserves snapshot · March 2026",
    hash: "0x12abf45c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
    uri: "https://por.hearst.io/snapshots/2026-03-31.json",
    postedAt: "2026-04-01T00:07:00Z",
    postedBy: "Fireblocks signer · custody@hearst",
    txHash: null,
  },
  {
    id: "audit-spearbit-2026q1",
    proofType: "audit",
    period: null,
    title: "Spearbit smart-contract review · vault skeleton",
    hash: "0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
    uri: "https://reports.spearbit.com/hearst-vault-2026q1.pdf",
    postedAt: "2026-03-18T15:30:00Z",
    postedBy: "Spearbit · external",
    txHash: null,
  },
  {
    id: "audit-trail-2026q1",
    proofType: "audit",
    period: null,
    title: "Trail of Bits scoping memo · Phase 2 EventLogger",
    hash: "0x55667788aabbccddeeff00112233445566778899aabbccddeeff001122334455",
    uri: "https://reports.trailofbits.com/hearst-eventlogger-scope.pdf",
    postedAt: "2026-02-27T13:00:00Z",
    postedBy: "Trail of Bits · external",
    txHash: null,
  },
  {
    id: "method-v1-0",
    proofType: "methodology",
    period: null,
    title: "Methodology v1.0 — vault yield + risk model",
    hash: "0xfeedcafe0123456789abcdeffeedcafe0123456789abcdeffeedcafe01234567",
    uri: "ipfs://bafybeia1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6methodol",
    postedAt: "2026-01-14T17:45:00Z",
    postedBy: "Hearst research · v1.0",
    txHash: null,
  },
  {
    id: "method-v1-0-glossary",
    proofType: "methodology",
    period: null,
    title: "Methodology v1.0 — glossary + assumption registry",
    hash: "0x0011223344556677889900aabbccddeeff00112233445566778899aabbccddee",
    uri: "ipfs://bafybeiglossaryxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxv1",
    postedAt: "2026-01-14T17:46:00Z",
    postedBy: "Hearst research · v1.0",
    txHash: null,
  },
];

export function getProofs(): ProofItem[] {
  return PROOFS;
}
