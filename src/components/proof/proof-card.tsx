import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EXPLORER_ADDRESS_BASE, EXPLORER_TX_BASE } from "@/lib/chain/client";
import type { ProofType } from "@/lib/mock/proof-center";

import type { UnifiedProof } from "./proof-types";

interface ProofCardProps {
  proof: UnifiedProof;
}

const TYPE_LABEL: Record<ProofType, string> = {
  mining_attestation: "Mining attestation",
  custody: "Custody",
  audit: "Audit",
  methodology: "Methodology",
};

const TYPE_VARIANT: Record<
  ProofType,
  "brand" | "success" | "warning" | "default"
> = {
  mining_attestation: "brand",
  custody: "success",
  audit: "warning",
  methodology: "default",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function uriLabel(uri: string): string {
  if (uri.startsWith("ipfs://")) return "View on IPFS";
  if (uri.startsWith("https://")) return "View document";
  return "Open";
}

function ipfsGatewayUrl(cid: string): string {
  // viem returns the raw CID string; the contract spec says no "ipfs://" prefix on payloadCid.
  if (cid.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${cid.slice("ipfs://".length)}`;
  }
  if (cid.startsWith("https://") || cid.startsWith("http://")) return cid;
  return `https://ipfs.io/ipfs/${cid}`;
}

function usdCompactFmt(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function btcFmt(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value)} BTC`;
}

export function ProofCard({ proof }: ProofCardProps) {
  if (proof.source === "paper") {
    return <PaperProofCard proof={proof} />;
  }
  if (proof.kind === "event") {
    return <OnChainEventCard proof={proof.data} />;
  }
  return <OnChainAttestationCard proof={proof.data} />;
}

function PaperProofCard({
  proof,
}: {
  proof: Extract<UnifiedProof, { source: "paper" }>;
}) {
  const postedAt = new Date(proof.postedAt);
  const hashTruncated = truncateHash(proof.hash);

  return (
    <Card className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">{TYPE_LABEL[proof.proofType]}</span>
          <Badge variant={TYPE_VARIANT[proof.proofType]}>
            {proof.period ?? "evergreen"}
          </Badge>
        </div>
        <h3 className="h4 text-balance">{proof.title}</h3>
      </header>

      <dl className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Source</dt>
          <dd className="body-xs text-[--ct-text-body]">Off-chain</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Posted</dt>
          <dd className="body-xs text-[--ct-text-body]">
            {dateFmt.format(postedAt)} UTC
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Signer</dt>
          <dd className="body-xs text-[--ct-text-body]">
            {proof.postedBy}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Hash</dt>
          <dd
            className="mono tabular text-xs text-[--ct-text-primary]"
            title={proof.hash}
            aria-label={`Hash ${proof.hash}`}
          >
            {hashTruncated}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <a
          href={proof.uri}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-[--radius-button] border border-[--ct-border-strong] bg-[--ct-surface-1] px-3 py-1.5 text-xs text-[--ct-text-primary] transition-colors duration-[150ms] hover:bg-[--ct-surface-3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ct-text-strong] focus-visible:ring-offset-2 focus-visible:ring-offset-[--ct-bg-deep]"
        >
          {uriLabel(proof.uri)}
        </a>
        {proof.txHash ? (
          <a
            href={`${EXPLORER_TX_BASE}${proof.txHash}`}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-[--radius-button] border border-[--ct-text-strong] bg-[--ct-surface-1] px-3 py-1.5 text-xs text-[--ct-text-strong] transition-colors duration-[150ms] hover:bg-[--ct-surface-2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ct-text-strong] focus-visible:ring-offset-2 focus-visible:ring-offset-[--ct-bg-deep]"
          >
            TX on Base
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-label="On-chain mirror not yet available — Phase 2 will publish this proof via the EventLogger contract."
            className="rounded-[--radius-button] border border-dashed border-[--ct-border-soft] px-3 py-1.5 text-xs text-[--ct-text-muted]"
            title="Phase 2 will mirror this proof on-chain via the EventLogger contract."
          >
            Off-chain (Phase 1)
          </button>
        )}
      </div>
    </Card>
  );
}

function OnChainEventCard({
  proof,
}: {
  proof: import("@/lib/chain/event-logger").OnChainEvent;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">EventLogger · {proof.kind}</span>
          <Badge variant="success" title="Read directly from Base Sepolia">
            On-chain
          </Badge>
        </div>
        <h3 className="h4 text-balance">
          Hearst event #{proof.eventId.toString()} — {proof.kind}
        </h3>
      </header>

      <dl className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Source</dt>
          <dd className="body-xs text-[--ct-text-body]">
            Base Sepolia · block {proof.blockNumber.toString()}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Posted</dt>
          <dd className="body-xs text-[--ct-text-body]">
            {dateFmt.format(proof.timestamp)} UTC
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Publisher</dt>
          <dd
            className="mono tabular text-xs text-[--ct-text-body]"
            title={proof.publisher}
          >
            {truncateAddress(proof.publisher)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Tx hash</dt>
          <dd
            className="mono tabular text-xs text-[--ct-text-primary]"
            title={proof.txHash}
            aria-label={`Transaction hash ${proof.txHash}`}
          >
            {truncateHash(proof.txHash)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Context hash</dt>
          <dd
            className="mono tabular text-xs text-[--ct-text-body]"
            title={proof.contextHash}
          >
            {truncateHash(proof.contextHash)}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {proof.payloadCid.length > 0 ? (
          <a
            href={ipfsGatewayUrl(proof.payloadCid)}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-[--radius-button] border border-[--ct-border-strong] bg-[--ct-surface-1] px-3 py-1.5 text-xs text-[--ct-text-primary] transition-colors duration-[150ms] hover:bg-[--ct-surface-3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ct-text-strong] focus-visible:ring-offset-2 focus-visible:ring-offset-[--ct-bg-deep]"
          >
            View payload (IPFS)
          </a>
        ) : null}
        <a
          href={`${EXPLORER_TX_BASE}${proof.txHash}`}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-[--radius-button] border border-[--ct-text-strong] bg-[--ct-surface-1] px-3 py-1.5 text-xs text-[--ct-text-strong] transition-colors duration-[150ms] hover:bg-[--ct-surface-2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ct-text-strong] focus-visible:ring-offset-2 focus-visible:ring-offset-[--ct-bg-deep]"
        >
          TX on Base
        </a>
      </div>
    </Card>
  );
}

function formatPeriod(period: bigint): string {
  // YYYYMM → "YYYY-MM"
  const raw = period.toString();
  if (raw.length !== 6) return raw;
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function OnChainAttestationCard({
  proof,
}: {
  proof: import("@/lib/chain/por-registry").OnChainAttestation;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">PoR attestation</span>
          <Badge variant="brand" title="Proof-of-reserves period">
            {formatPeriod(proof.period)}
          </Badge>
        </div>
        <h3 className="h4 text-balance">
          PoR #{proof.attestationId.toString()} — {formatPeriod(proof.period)}
        </h3>
      </header>

      <dl className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Source</dt>
          <dd className="body-xs">
            <span className="rounded-[--radius-full] border border-[--ct-status-success-border] bg-[--ct-status-success-soft] px-1.5 py-0.5 text-[length:var(--ct-text-micro)] uppercase tracking-wider text-[--ct-status-success]">
              On-chain
            </span>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Total AUM</dt>
          <dd className="mono tabular text-xs text-[--ct-text-primary]">
            {usdCompactFmt(proof.totalAumUsd)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Mined</dt>
          <dd className="mono tabular text-xs text-[--ct-text-primary]">
            {btcFmt(proof.minedBtc)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Attestor</dt>
          <dd
            className="mono tabular text-xs text-[--ct-text-body]"
            title={proof.attestor}
          >
            <a
              href={`${EXPLORER_ADDRESS_BASE}${proof.attestor}`}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-[--ct-text-strong]"
            >
              {truncateAddress(proof.attestor)}
            </a>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Evidence hash</dt>
          <dd
            className="mono tabular text-xs text-[--ct-text-primary]"
            title={proof.evidenceHash}
          >
            {truncateHash(proof.evidenceHash)}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {proof.evidenceCid.length > 0 ? (
          <a
            href={ipfsGatewayUrl(proof.evidenceCid)}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-[--radius-button] border border-[--ct-border-strong] bg-[--ct-surface-1] px-3 py-1.5 text-xs text-[--ct-text-primary] transition-colors duration-[150ms] hover:bg-[--ct-surface-3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ct-text-strong] focus-visible:ring-offset-2 focus-visible:ring-offset-[--ct-bg-deep]"
          >
            View evidence (IPFS)
          </a>
        ) : null}
        <a
          href={`${EXPLORER_TX_BASE}${proof.txHash}`}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-[--radius-button] border border-[--ct-text-strong] bg-[--ct-surface-1] px-3 py-1.5 text-xs text-[--ct-text-strong] transition-colors duration-[150ms] hover:bg-[--ct-surface-2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ct-text-strong] focus-visible:ring-offset-2 focus-visible:ring-offset-[--ct-bg-deep]"
        >
          TX on Base
        </a>
      </div>
    </Card>
  );
}
