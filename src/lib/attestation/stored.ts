import { verifyAttestation } from "./verify";
import type {
  MiningAttestationPayload,
  SignedAttestation,
  VerificationResult,
} from "./types";

/** The attestation-relevant columns of a persisted `Proof` row. */
export interface StoredAttestation {
  /** Canonical `MiningAttestationPayload` as JSON, or null for unsigned proofs. */
  payloadJson: string | null;
  /** keccak256 digest (the `Proof.hash` column). */
  digest: string | null;
  /** EIP-191 signature over `digest`. */
  signature: string | null;
  /** Address expected to have signed (the `Proof.signer` column). */
  signer: string | null;
}

/**
 * Narrowing parse of a stored payload — avoids `any` from `JSON.parse` and
 * guards every field the canonical encoder reads, so a malformed row fails
 * verification rather than throwing.
 */
export function parseAttestationPayload(
  json: string,
): MiningAttestationPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const o = parsed as Record<string, unknown>;
  const ok =
    o.version === 1 &&
    typeof o.period === "string" &&
    typeof o.partner === "string" &&
    typeof o.attestor === "string" &&
    o.attestor.startsWith("0x") &&
    typeof o.deployedHashrateThs === "number" &&
    typeof o.uptimePct === "number" &&
    typeof o.hashpriceUsdPerThDay === "number" &&
    typeof o.minedBtc === "number" &&
    typeof o.revenueUsd === "number" &&
    typeof o.operatingCostUsd === "number" &&
    typeof o.totalAumUsd === "number" &&
    typeof o.evidenceCid === "string";
  if (!ok) return null;
  return {
    version: 1,
    period: o.period as string,
    partner: o.partner as string,
    attestor: o.attestor as `0x${string}`,
    deployedHashrateThs: o.deployedHashrateThs as number,
    uptimePct: o.uptimePct as number,
    hashpriceUsdPerThDay: o.hashpriceUsdPerThDay as number,
    minedBtc: o.minedBtc as number,
    revenueUsd: o.revenueUsd as number,
    operatingCostUsd: o.operatingCostUsd as number,
    totalAumUsd: o.totalAumUsd as number,
    evidenceCid: o.evidenceCid as string,
  };
}

/**
 * Verifies an attestation reconstructed from DB columns.
 *
 * Returns `null` for proofs that carry no signature (custody/audit/methodology),
 * otherwise a full {@link VerificationResult}. On top of the standard digest +
 * signature checks, it also enforces that the recovered signer matches the
 * stored `signer` column — so a row whose `signer` was edited fails too.
 */
export async function verifyStoredAttestation(
  row: StoredAttestation,
): Promise<VerificationResult | null> {
  if (!row.payloadJson || !row.digest || !row.signature || !row.signer) {
    return null;
  }

  const payload = parseAttestationPayload(row.payloadJson);
  if (payload === null) {
    return { valid: false, recovered: null, reason: "digest_mismatch" };
  }

  const signed: SignedAttestation = {
    payload,
    digest: row.digest as `0x${string}`,
    signature: row.signature as `0x${string}`,
    signedAt: new Date(0).toISOString(), // not part of verification
  };

  const result = await verifyAttestation(signed);
  if (
    result.valid &&
    result.recovered &&
    result.recovered.toLowerCase() !== row.signer.toLowerCase()
  ) {
    return { valid: false, recovered: result.recovered, reason: "signer_mismatch" };
  }
  return result;
}
