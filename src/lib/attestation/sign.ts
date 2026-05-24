import { privateKeyToAccount } from "viem/accounts";

import { digestOf } from "./canonical";
import type { MiningAttestationPayload, SignedAttestation } from "./types";

/** Checksummed address derived from a signing key. */
export function attestorAddress(
  privateKey: `0x${string}`,
): `0x${string}` {
  return privateKeyToAccount(privateKey).address;
}

/**
 * Signs an attestation payload with `privateKey` (EIP-191 over the keccak256
 * digest). The signature is deterministic for a given key+payload (RFC 6979),
 * so seeds and snapshot tests stay reproducible.
 *
 * Note: this signs whatever `payload.attestor` says — it does not overwrite it.
 * If the key's address differs from `payload.attestor`, the result will fail
 * verification, which is the correct behaviour (you cannot sign as someone else).
 */
export async function signAttestation(
  payload: MiningAttestationPayload,
  privateKey: `0x${string}`,
  opts: { at?: Date } = {},
): Promise<SignedAttestation> {
  const digest = digestOf(payload);
  const account = privateKeyToAccount(privateKey);
  const signature = await account.signMessage({ message: { raw: digest } });

  return {
    payload,
    digest,
    signature,
    signedAt: (opts.at ?? new Date()).toISOString(),
  };
}
