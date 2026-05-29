import { describe, expect, it } from "vitest";

import { resolveVaultAddress } from "@/lib/onchain/vault";

// ---------------------------------------------------------------------------
// C-02 — resolveVaultAddress
// ---------------------------------------------------------------------------

describe("resolveVaultAddress", () => {
  const VALID_ADDRESS = "0xaAbBcCdDeEfF001122334455667788990011aAbB";

  it("resolves from canonical NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS", () => {
    const result = resolveVaultAddress({
      NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS: VALID_ADDRESS,
    });
    expect(result).toBe(VALID_ADDRESS);
  });

  it("resolves from legacy NEXT_PUBLIC_HEARST_VAULT_ADDRESS when canonical is absent", () => {
    const result = resolveVaultAddress({
      NEXT_PUBLIC_HEARST_VAULT_ADDRESS: VALID_ADDRESS,
    });
    expect(result).toBe(VALID_ADDRESS);
  });

  it("prioritises canonical over legacy when both are set", () => {
    const canonical = "0x1111111111111111111111111111111111111111";
    const legacy = "0x2222222222222222222222222222222222222222";
    const result = resolveVaultAddress({
      NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS: canonical,
      NEXT_PUBLIC_HEARST_VAULT_ADDRESS: legacy,
    });
    expect(result).toBe(canonical);
  });

  it("returns null when neither env var is set", () => {
    expect(resolveVaultAddress({})).toBeNull();
  });

  it("returns null for a malformed address (wrong length)", () => {
    expect(
      resolveVaultAddress({ NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS: "0xDEAD" }),
    ).toBeNull();
  });

  it("returns null for a value missing 0x prefix", () => {
    expect(
      resolveVaultAddress({
        NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS:
          "aAbBcCdDeEfF001122334455667788990011aAbB",
      }),
    ).toBeNull();
  });

  it("result is non-null and matches 0x+40hex pattern for a valid canonical address", () => {
    const result = resolveVaultAddress({
      NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS: VALID_ADDRESS,
    });
    expect(result).not.toBeNull();
    expect(result).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});
