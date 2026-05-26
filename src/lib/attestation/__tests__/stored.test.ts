import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

/**
 * `vi.stubEnv` handles the snapshot/restore mechanics for env vars (including
 * the read-only `NODE_ENV`), and `vi.unstubAllEnvs` in afterEach guarantees no
 * leakage between tests. Default posture: allowlist the mock attestor so the
 * legacy assertions (signing with the Anvil mock key) keep verifying without
 * touching the dev bypass — i.e. the allowlist is exercised, not skipped.
 */
beforeEach(() => {
  vi.stubEnv("ATTESTATION_ALLOWED_SIGNERS", MOCK_ATTESTOR_ADDRESS);
  vi.stubEnv("ATTESTATION_DEV_ACCEPT_ANY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

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

  it("verifies a faithfully persisted attestation when signer is allowlisted", async () => {
    const signed = await signMockAttestation("2026-03");
    const res = await verifyStoredAttestation(toStored(signed));
    expect(res?.valid).toBe(true);
    expect(res?.reason).toBe("ok");
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
    // Allowlist both addresses so we exercise the (c) signer-column check
    // rather than the (b) allowlist gate.
    vi.stubEnv(
      "ATTESTATION_ALLOWED_SIGNERS",
      `${MOCK_ATTESTOR_ADDRESS},${OTHER_ADDRESS}`,
    );
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

describe("verifyStoredAttestation — signer allowlist", () => {
  it("rejects a valid signature from a signer not in the allowlist", async () => {
    const signed = await signMockAttestation("2026-03");
    // Mock attestor NOT included.
    vi.stubEnv("ATTESTATION_ALLOWED_SIGNERS", OTHER_ADDRESS);
    const res = await verifyStoredAttestation(toStored(signed));
    expect(res?.valid).toBe(false);
    expect(res?.reason).toBe("signer_not_allowlisted");
    expect(res?.recovered?.toLowerCase()).toBe(
      MOCK_ATTESTOR_ADDRESS.toLowerCase(),
    );
  });

  it("fail-closes in production when no allowlist is configured", async () => {
    const signed = await signMockAttestation("2026-03");
    vi.stubEnv("ATTESTATION_ALLOWED_SIGNERS", "");
    vi.stubEnv("ATTESTATION_DEV_ACCEPT_ANY", "");
    vi.stubEnv("NODE_ENV", "production");
    const res = await verifyStoredAttestation(toStored(signed));
    expect(res?.valid).toBe(false);
    expect(res?.reason).toBe("no_allowlist_configured");
  });

  it("also fail-closes in non-production when no allowlist is configured and no dev bypass", async () => {
    const signed = await signMockAttestation("2026-03");
    vi.stubEnv("ATTESTATION_ALLOWED_SIGNERS", "");
    vi.stubEnv("ATTESTATION_DEV_ACCEPT_ANY", "");
    vi.stubEnv("NODE_ENV", "test");
    const res = await verifyStoredAttestation(toStored(signed));
    expect(res?.valid).toBe(false);
    expect(res?.reason).toBe("no_allowlist_configured");
  });

  it("dev bypass (ATTESTATION_DEV_ACCEPT_ANY=1) accepts any signer outside production", async () => {
    const signed = await signMockAttestation("2026-03");
    vi.stubEnv("ATTESTATION_ALLOWED_SIGNERS", "");
    vi.stubEnv("ATTESTATION_DEV_ACCEPT_ANY", "1");
    vi.stubEnv("NODE_ENV", "development");
    const res = await verifyStoredAttestation(toStored(signed));
    expect(res?.valid).toBe(true);
    expect(res?.reason).toBe("ok");
  });

  it("dev bypass is IGNORED in production (fail-closed even with ATTESTATION_DEV_ACCEPT_ANY=1)", async () => {
    const signed = await signMockAttestation("2026-03");
    vi.stubEnv("ATTESTATION_ALLOWED_SIGNERS", "");
    vi.stubEnv("ATTESTATION_DEV_ACCEPT_ANY", "1");
    vi.stubEnv("NODE_ENV", "production");
    const res = await verifyStoredAttestation(toStored(signed));
    expect(res?.valid).toBe(false);
    expect(res?.reason).toBe("no_allowlist_configured");
  });

  it("is tolerant of whitespace and casing in the allowlist", async () => {
    const signed = await signMockAttestation("2026-03");
    // Mixed casing, padded with spaces, and a stray empty entry — all OK.
    vi.stubEnv(
      "ATTESTATION_ALLOWED_SIGNERS",
      `  ${MOCK_ATTESTOR_ADDRESS.toLowerCase()} ,, ${OTHER_ADDRESS.toUpperCase().replace("0X", "0x")} `,
    );
    const res = await verifyStoredAttestation(toStored(signed));
    expect(res?.valid).toBe(true);
  });
});
