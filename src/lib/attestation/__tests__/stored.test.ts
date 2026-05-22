import { describe, expect, it } from "vitest";

import { signMockAttestation, MOCK_ATTESTOR_ADDRESS } from "../mock";
import { attestorAddress } from "../sign";
import {
  parseAttestationPayload,
  verifyStoredAttestation,
  type StoredAttestation,
} from "../stored";
import type { SignedAttestation } from "../types";

const OTHER_ADDRESS = attestorAddress(
  "0xac0974bec39a17e36ba4a6b4d238ff944bac48d8b75c0c8b9d1f96c8a58a4022",
);

/** Mirrors how the seed persists a signed attestation into `Proof` columns. */
function toStored(signed: SignedAttestation): StoredAttestation {
  return {
    payloadJson: JSON.stringify(signed.payload),
    digest: signed.digest,
    signature: signed.signature,
    signer: signed.payload.attestor,
  };
}

describe("parseAttestationPayload", () => {
  it("round-trips a valid payload", async () => {
    const signed = await signMockAttestation("2026-04");
    const parsed = parseAttestationPayload(JSON.stringify(signed.payload));
    expect(parsed).toEqual(signed.payload);
  });

  it("rejects malformed JSON and missing fields", () => {
    expect(parseAttestationPayload("{not json")).toBeNull();
    expect(parseAttestationPayload(JSON.stringify({ version: 1 }))).toBeNull();
    expect(parseAttestationPayload(JSON.stringify(null))).toBeNull();
  });
});

describe("verifyStoredAttestation", () => {
  it("returns null for an unsigned proof (custody/audit/methodology)", async () => {
    expect(
      await verifyStoredAttestation({
        payloadJson: null,
        digest: "0xabc",
        signature: null,
        signer: null,
      }),
    ).toBeNull();
  });

  it("verifies a faithfully persisted attestation", async () => {
    const signed = await signMockAttestation("2026-03");
    const res = await verifyStoredAttestation(toStored(signed));
    expect(res?.valid).toBe(true);
    expect(res?.recovered).toBe(MOCK_ATTESTOR_ADDRESS);
  });

  it("fails when the stored payload was tampered", async () => {
    const signed = await signMockAttestation("2026-03");
    const tampered = {
      ...signed.payload,
      minedBtc: signed.payload.minedBtc + 1,
    };
    const res = await verifyStoredAttestation({
      ...toStored(signed),
      payloadJson: JSON.stringify(tampered),
    });
    expect(res?.valid).toBe(false);
    expect(res?.reason).toBe("digest_mismatch");
  });

  it("fails when the stored signer column does not match the recovered signer", async () => {
    const signed = await signMockAttestation("2026-03");
    const res = await verifyStoredAttestation({
      ...toStored(signed),
      signer: OTHER_ADDRESS,
    });
    expect(res?.valid).toBe(false);
    expect(res?.reason).toBe("signer_mismatch");
  });

  it("fails when the stored JSON is unparseable", async () => {
    const signed = await signMockAttestation("2026-03");
    const res = await verifyStoredAttestation({
      ...toStored(signed),
      payloadJson: "{broken",
    });
    expect(res?.valid).toBe(false);
    expect(res?.reason).toBe("digest_mismatch");
  });
});
