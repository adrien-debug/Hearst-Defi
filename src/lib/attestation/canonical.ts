import { keccak256, stringToHex } from "viem";

import type { MiningAttestationPayload } from "./types";

const DOMAIN = "HearstMiningAttestation";

/**
 * Fixed-precision rendering so floating-point noise (e.g. `0.1 + 0.2`) can never
 * shift the digest between machines or runs. Throws on non-finite input rather
 * than silently encoding `"NaN"`.
 */
function fixed(value: number, decimals: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`attestation: non-finite numeric field (${value})`);
  }
  return value.toFixed(decimals);
}

/**
 * Deterministic, human-auditable encoding of an attestation payload.
 *
 * Field order and per-field precision are FROZEN — both are inputs to the
 * digest, and `version` is the first line precisely so a future schema change
 * is forced to bump it rather than silently colliding old and new digests.
 */
export function canonicalize(p: MiningAttestationPayload): string {
  return [
    `${DOMAIN}:v${p.version}`,
    `period=${p.period}`,
    `partner=${p.partner}`,
    `attestor=${p.attestor.toLowerCase()}`,
    `deployedHashrateThs=${fixed(p.deployedHashrateThs, 2)}`,
    `uptimePct=${fixed(p.uptimePct, 2)}`,
    `hashpriceUsdPerThDay=${fixed(p.hashpriceUsdPerThDay, 6)}`,
    `minedBtc=${fixed(p.minedBtc, 8)}`,
    `revenueUsd=${fixed(p.revenueUsd, 2)}`,
    `operatingCostUsd=${fixed(p.operatingCostUsd, 2)}`,
    `totalAumUsd=${fixed(p.totalAumUsd, 2)}`,
    `evidenceCid=${p.evidenceCid}`,
  ].join("\n");
}

/** keccak256 of the canonical encoding — stable across runs and machines. */
export function digestOf(p: MiningAttestationPayload): `0x${string}` {
  return keccak256(stringToHex(canonicalize(p)));
}
