# ADR-004 — Off-chain attestation digest == on-chain PoR evidenceHash

**Status**: Accepted
**Date**: 2026-05-22
**Deciders**: Eng

## Context

The MVP needs mining attestations that are genuinely *signed and verifiable*
before the on-chain Proof-of-Reserves path is in production (`mock-attestation`
roadmap item). Naively, a mock would carry a random hash and be discarded once
`PoRRegistry` goes live — wasted work and a discontinuity for the LP committee.

## Decision

The **keccak256 digest of the canonical attestation payload IS the value pinned
on-chain** as `PoRRegistry`'s `evidenceHash`. Concretely:

- One frozen canonical encoding of `MiningAttestationPayload` (`src/lib/attestation/canonical.ts`).
- `digest = keccak256(canonical)` — this is both the mock's hash and the future on-chain `evidenceHash`.
- Sign EIP-191 over `digest` (partner key; mock uses a published Anvil test key).
- Persist `payloadJson` + `signature` + `signer` on `Proof` so verification is **end-to-end** at read time (re-derive digest → recover signer → check against stored signer).

## Rationale

- **Forward-compatible**: today's mock attestations stay verifiable once on-chain publishing lands — no re-modelling.
- **Single source of truth**: one encoder for mock + on-chain; the digest already matches what `chain/por-registry.ts` reads.
- **Verifiable now**: `verifyStoredAttestation` proves integrity + authorship without any chain dependency.

## Consequences

- The canonical encoding is **frozen per `version`**: changing any field or its precision must bump `version` (old digests stay valid for old rows).
- Real attestations swap the mock signer for the partner farm's HSM key in Phase 2; nothing else changes.
