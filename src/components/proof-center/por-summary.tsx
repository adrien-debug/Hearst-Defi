import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Metric } from "@/components/ui/metric";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import {
  EXPLORER_ADDRESS_BASE,
  EXPLORER_TX_BASE,
} from "@/lib/chain/client";
import type { OnChainAttestation } from "@/lib/chain/por-registry";
import {
  formatPeriod,
  formatBtc,
  formatUsdCompact,
  formatUtcDateTimeLong,
  truncateAddress,
  truncateHash,
} from "@/lib/format/chain-display";

interface PorSummaryProps {
  attestation: OnChainAttestation | null;
}

function isStale(ts: Date): boolean {
  const ageMs = Date.now() - ts.getTime();
  return ageMs > 24 * 60 * 60 * 1000;
}

export function PorSummary({ attestation }: PorSummaryProps) {
  if (attestation === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proof of Reserves</CardTitle>
          <ProvenanceBadge kind="manual" />
        </CardHeader>
        <p className="body-sm">
          No on-chain Proof of Reserves attestation yet. Contracts are live on
          Base Sepolia — the publisher will post the first attestation after the
          initial vault period closes.
        </p>
      </Card>
    );
  }

  const stale = isStale(attestation.timestamp);
  const provenance = stale ? "stale" : "attested";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Proof of Reserves</span>
          <CardTitle>
            Period {formatPeriod(attestation.period)} — Attestation #
            {attestation.attestationId.toString()}
          </CardTitle>
        </div>
        <ProvenanceBadge kind={provenance} />
      </CardHeader>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric
          label="Total AUM"
          value={formatUsdCompact(attestation.totalAumUsd)}
          provenance={provenance}
        />
        <Metric
          label="Mined (period)"
          value={formatBtc(attestation.minedBtc)}
          provenance={provenance}
        />
        <Metric
          label="Attested at"
          value={formatUtcDateTimeLong(attestation.timestamp)}
          sublabel="UTC"
          provenance={provenance}
        />
        <Metric
          label="Period"
          value={formatPeriod(attestation.period)}
          provenance={provenance}
        />
      </div>

      <dl className="mt-6 space-y-2 border-t border-[--ct-border-soft] pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <dt className="body-xs">Attestor address</dt>
          <dd>
            <a
              href={`${EXPLORER_ADDRESS_BASE}${attestation.attestor}`}
              target="_blank"
              rel="noreferrer noopener"
              className="mono tabular text-xs ct-text-primary hover:text-[--ct-text-strong] transition-colors duration-(--ct-dur-fast)"
              title={attestation.attestor}
            >
              {truncateAddress(attestation.attestor)}
            </a>
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <dt className="body-xs">Evidence hash</dt>
          <dd
            className="mono tabular text-xs ct-text-body"
            title={attestation.evidenceHash}
          >
            {truncateHash(attestation.evidenceHash)}
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <dt className="body-xs">Block</dt>
          <dd className="mono tabular text-xs ct-text-body">
            {attestation.blockNumber.toString()}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <a
            href={`${EXPLORER_TX_BASE}${attestation.txHash}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            View attestation tx on Base Sepolia
          </a>
        </Button>
        {attestation.evidenceCid.length > 0 ? (
          <Button asChild variant="secondary" size="sm">
            <a
              href={
                attestation.evidenceCid.startsWith("ipfs://")
                  ? `https://ipfs.io/ipfs/${attestation.evidenceCid.slice(7)}`
                  : attestation.evidenceCid.startsWith("https://")
                    ? attestation.evidenceCid
                    : `https://ipfs.io/ipfs/${attestation.evidenceCid}`
              }
              target="_blank"
              rel="noreferrer noopener"
            >
              View evidence (IPFS)
            </a>
          </Button>
        ) : null}
      </div>

      {stale ? (
        <p className="mt-3 body-xs ct-status-warning">
          Last attestation is older than 24h — badge shows Stale. A fresh
          attestation is expected each period close.
        </p>
      ) : null}
    </Card>
  );
}
