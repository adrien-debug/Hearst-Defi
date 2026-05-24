import { describe, expect, it } from "vitest";

import { canonicalize, digestOf } from "../canonical";
import {
  buildMockAttestation,
  MOCK_ATTESTOR_ADDRESS,
  signMockAttestation,
} from "../mock";
import { attestorAddress, signAttestation } from "../sign";
import { MOCK_ATTESTOR_PRIVATE_KEY } from "../__mocks__/mock-key";
import type { MiningAttestationPayload } from "../types";
import { verifyAttestation } from "../verify";

// A different valid test key — used to forge a signature from the "wrong" signer.
const OTHER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bac48d8b75c0c8b9d1f96c8a58a4022" as const;

const AT = new Date("2026-04-05T09:00:00Z");

function fixture(
  overrides: Partial<MiningAttestationPayload> = {},
): MiningAttestationPayload {
  return buildMockAttestation("2026-04", overrides);
}

describe("attestor key", () => {
  it("derives the well-known Anvil #1 address", () => {
    expect(MOCK_ATTESTOR_ADDRESS).toBe(
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    );
    expect(attestorAddress(MOCK_ATTESTOR_PRIVATE_KEY)).toBe(
      MOCK_ATTESTOR_ADDRESS,
    );
  });
});

describe("canonicalize / digestOf", () => {
  it("pins the header line to the schema version", () => {
    expect(canonicalize(fixture()).startsWith("HearstMiningAttestation:v1\n")).toBe(
      true,
    );
  });

  it("is deterministic and produces a bytes32 digest", () => {
    const p = fixture();
    expect(digestOf(p)).toBe(digestOf(p));
    expect(digestOf(p)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("changes the digest when any field changes", () => {
    const base = fixture();
    expect(digestOf({ ...base, minedBtc: base.minedBtc + 0.00000001 })).not.toBe(
      digestOf(base),
    );
    expect(digestOf({ ...base, period: "2026-05" })).not.toBe(digestOf(base));
  });

  it("is insensitive to attestor address casing", () => {
    const lower = fixture({
      attestor: MOCK_ATTESTOR_ADDRESS.toLowerCase() as `0x${string}`,
    });
    const upper = fixture({
      attestor: MOCK_ATTESTOR_ADDRESS.toUpperCase().replace(
        "0X",
        "0x",
      ) as `0x${string}`,
    });
    expect(digestOf(lower)).toBe(digestOf(upper));
  });
});

describe("sign + verify round-trip", () => {
  it("a freshly signed attestation verifies", async () => {
    const signed = await signAttestation(fixture(), MOCK_ATTESTOR_PRIVATE_KEY, {
      at: AT,
    });
    const res = await verifyAttestation(signed);
    expect(res).toEqual({
      valid: true,
      recovered: MOCK_ATTESTOR_ADDRESS,
      reason: "ok",
    });
  });

  it("is reproducible: same key + payload + time → identical signature", async () => {
    const p = fixture();
    const a = await signAttestation(p, MOCK_ATTESTOR_PRIVATE_KEY, { at: AT });
    const b = await signAttestation(p, MOCK_ATTESTOR_PRIVATE_KEY, { at: AT });
    expect(a).toEqual(b);
  });

  it("signMockAttestation produces a verifiable, deterministically-timed attestation", async () => {
    const signed = await signMockAttestation("2026-04");
    expect(signed.signedAt).toBe("2026-04-05T09:00:00.000Z");
    expect((await verifyAttestation(signed)).valid).toBe(true);
  });
});

describe("verify failure modes", () => {
  it("rejects a payload tampered after signing (digest_mismatch)", async () => {
    const signed = await signAttestation(fixture(), MOCK_ATTESTOR_PRIVATE_KEY, {
      at: AT,
    });
    const tampered = {
      ...signed,
      payload: { ...signed.payload, minedBtc: signed.payload.minedBtc + 1 },
    };
    const res = await verifyAttestation(tampered);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("digest_mismatch");
  });

  it("rejects a valid signature from the wrong signer (signer_mismatch)", async () => {
    // Payload claims OTHER_KEY's address, but we sign with the mock key.
    const payload = fixture({ attestor: attestorAddress(OTHER_KEY) });
    const signed = await signAttestation(payload, MOCK_ATTESTOR_PRIVATE_KEY, {
      at: AT,
    });
    const res = await verifyAttestation(signed);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("signer_mismatch");
    expect(res.recovered).toBe(MOCK_ATTESTOR_ADDRESS);
  });

  it("rejects a malformed signature (bad_signature)", async () => {
    const signed = await signAttestation(fixture(), MOCK_ATTESTOR_PRIVATE_KEY, {
      at: AT,
    });
    const res = await verifyAttestation({
      ...signed,
      signature: "0x1234" as `0x${string}`,
    });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("bad_signature");
  });
});

describe("mock factory consistency", () => {
  it("builds internally consistent economics (revenue > cost, positive margin)", () => {
    const p = fixture();
    expect(p.revenueUsd).toBeGreaterThan(0);
    expect(p.operatingCostUsd).toBeGreaterThan(0);
    expect(p.revenueUsd).toBeGreaterThan(p.operatingCostUsd);
    expect(p.uptimePct).toBeGreaterThanOrEqual(95);
    expect(p.uptimePct).toBeLessThanOrEqual(99);
    expect(p.minedBtc).toBeGreaterThan(0);
  });

  it("is deterministic per period and distinct across periods", () => {
    expect(buildMockAttestation("2026-04")).toEqual(buildMockAttestation("2026-04"));
    expect(digestOf(buildMockAttestation("2026-04"))).not.toBe(
      digestOf(buildMockAttestation("2026-03")),
    );
  });
});
