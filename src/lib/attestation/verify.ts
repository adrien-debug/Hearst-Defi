import { recoverMessageAddress } from "viem";

import { digestOf } from "./canonical";
import type { SignedAttestation, VerificationResult } from "./types";

/**
 * Verifies a signed attestation in two independent steps:
 *   1. Re-derive the digest from the payload and compare — catches any field
 *      tampered after signing.
 *   2. Recover the signer from the signature and compare to `payload.attestor`.
 *
 * Never throws; a malformed signature returns `bad_signature` rather than
 * blowing up the caller.
 */
export async function verifyAttestation(
  signed: SignedAttestation,
): Promise<VerificationResult> {
  const expectedDigest = digestOf(signed.payload);
  if (expectedDigest.toLowerCase() !== signed.digest.toLowerCase()) {
    return { valid: false, recovered: null, reason: "digest_mismatch" };
  }

  let recovered: `0x${string}`;
  try {
    recovered = await recoverMessageAddress({
      message: { raw: signed.digest },
      signature: signed.signature,
    });
  } catch {
    return { valid: false, recovered: null, reason: "bad_signature" };
  }

  if (recovered.toLowerCase() !== signed.payload.attestor.toLowerCase()) {
    return { valid: false, recovered, reason: "signer_mismatch" };
  }

  return { valid: true, recovered, reason: "ok" };
}
