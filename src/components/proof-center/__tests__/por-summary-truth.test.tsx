import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PorSummary } from "@/components/proof-center/por-summary";
import type { OnChainAttestation } from "@/lib/chain/por-registry";

// A4 — the "Attested" badge must require a verified, allowlisted signer, not
// just a fresh (<24h) timestamp.

function freshAttestation(): OnChainAttestation {
  return {
    attestationId: 1n,
    period: 202605n,
    attestor: "0x1111111111111111111111111111111111111111",
    totalAumUsd: 25_000_000,
    minedBtc: 12.3456,
    rawTotalAumUsd: 25_000_000_000_000n,
    rawMinedBtcSats: 1_234_560_000n,
    evidenceHash: "0xabc",
    evidenceCid: "ipfs://QmTest",
    timestamp: new Date(), // fresh
    txHash: "0xdef",
    blockNumber: 123n,
  };
}

// The ProvenanceBadge sets title="Data provenance: <Label>" — assert on that
// precise attribute (the string "Attested" also appears as the "Attested at"
// metric label, so a bare substring check would be meaningless).
const ATTESTED_BADGE = "Data provenance: Attested";
const STALE_BADGE = "Data provenance: Stale";

describe("PorSummary — Attested requires verification (A4)", () => {
  it("shows Stale (not Attested) for a fresh but UNVERIFIED attestation", () => {
    const html = renderToStaticMarkup(
      <PorSummary attestation={freshAttestation()} verified={false} />,
    );
    expect(html).toContain(STALE_BADGE);
    expect(html).not.toContain(ATTESTED_BADGE);
    expect(html).toContain("not yet verified against the allowlist");
  });

  it("defaults to Stale when the verified flag is omitted (fail-closed)", () => {
    const html = renderToStaticMarkup(
      <PorSummary attestation={freshAttestation()} />,
    );
    expect(html).toContain(STALE_BADGE);
    expect(html).not.toContain(ATTESTED_BADGE);
  });

  it("shows Attested only when fresh AND verified", () => {
    const html = renderToStaticMarkup(
      <PorSummary attestation={freshAttestation()} verified={true} />,
    );
    expect(html).toContain(ATTESTED_BADGE);
    expect(html).not.toContain(STALE_BADGE);
  });
});
