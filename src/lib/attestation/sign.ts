import { privateKeyToAccount } from "viem/accounts";

import { digestOf } from "./canonical";
import type { MiningAttestationPayload, SignedAttestation } from "./types";

/**
 * Well-known Anvil/Hardhat test key #1 (address `0x7099…79C8`). **MOCK ONLY** —
 * it is published in every tutorial, holds no value, and must never touch
 * mainnet. Real attestations are signed by the partner farm's HSM-held key in
 * Phase 2; this exists so the seed and Proof Center can show genuinely
 * *verifiable* signatures pre-launch.
 */
export const MOCK_ATTESTOR_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;

/** Checksummed address derived from a signing key. */
export function attestorAddress(
  privateKey: `0x${string}` = MOCK_ATTESTOR_PRIVATE_KEY,
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
  privateKey: `0x${string}` = MOCK_ATTESTOR_PRIVATE_KEY,
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
