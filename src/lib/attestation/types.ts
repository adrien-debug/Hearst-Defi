// Off-chain mining attestation primitives. Pure + isomorphic (no fs, no prisma,
// no fetch) so the engine, seed, tests, and server actions can all share them.
//
// The shape mirrors what a partner farm signs off-chain and what `PoRRegistry`
// pins on-chain in Phase 2 (`evidenceHash` == our `digest`). Keeping the two in
// lock-step means today's mock attestations stay verifiable once real on-chain
// publishing lands — no re-modelling.

/** Reporting period in canonical `"YYYY-MM"` form. */
export type AttestationPeriod = string;

/**
 * Business payload of a monthly mining attestation. Every field feeds the
 * canonical digest, so the set is frozen per `version`: adding/removing a field
 * or changing its precision is a breaking change that must bump `version`.
 */
export interface MiningAttestationPayload {
  /** Schema version — part of the digest. Bumping invalidates old digests. */
  version: 1;
  /** `"YYYY-MM"` reporting period. */
  period: AttestationPeriod;
  /** Partner farm legal/display name. */
  partner: string;
  /** Attestor address (the farm's signing key). Recovered signer must match. */
  attestor: `0x${string}`;
  /** Contracted hashrate exposed to the vault, TH/s. */
  deployedHashrateThs: number;
  /** Average measured uptime over the period, percent in [0, 100]. */
  uptimePct: number;
  /** Average hashprice over the period, USD per TH per day. */
  hashpriceUsdPerThDay: number;
  /** BTC mined and delivered for the period. */
  minedBtc: number;
  /** Gross mining revenue for the period, USD. */
  revenueUsd: number;
  /** Operating costs (energy + hosting + pool fee + maintenance), USD. */
  operatingCostUsd: number;
  /** Vault AUM attributed at attestation time, USD. */
  totalAumUsd: number;
  /** IPFS CID of the full evidence bundle (invoices, pool stats, meter reads). */
  evidenceCid: string;
}

/** A payload plus its keccak256 digest and the attestor's EIP-191 signature. */
export interface SignedAttestation {
  payload: MiningAttestationPayload;
  /** keccak256 of the canonical encoding — equals the on-chain `evidenceHash`. */
  digest: `0x${string}`;
  /** EIP-191 signature over `digest`, produced by `payload.attestor`. */
  signature: `0x${string}`;
  /** ISO-8601 instant the signature was produced. */
  signedAt: string;
}

/** Why an attestation passed or failed verification. */
export type VerificationReason =
  | "ok"
  | "digest_mismatch" // payload was altered after signing
  | "signer_mismatch" // signature is valid but not from `payload.attestor`
  | "bad_signature"; // signature is malformed / unrecoverable

export interface VerificationResult {
  /** True only when `reason === "ok"`. */
  valid: boolean;
  /** Address recovered from the signature, or null when unrecoverable. */
  recovered: `0x${string}` | null;
  reason: VerificationReason;
}
