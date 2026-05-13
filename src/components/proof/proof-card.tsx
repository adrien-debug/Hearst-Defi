import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ProofItem, ProofType } from "@/lib/mock/proof-center";

interface ProofCardProps {
  proof: ProofItem;
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

function isHttps(uri: string): boolean {
  return uri.startsWith("https://");
}

function uriLabel(uri: string): string {
  if (uri.startsWith("ipfs://")) return "View on IPFS";
  if (isHttps(uri)) return "View document";
  return "Open";
}

export function ProofCard({ proof }: ProofCardProps) {
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
        <h3 className="h3 text-balance">{proof.title}</h3>
      </header>

      <dl className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Posted</dt>
          <dd className="body-xs text-[--color-text-muted]">
            {dateFmt.format(postedAt)} UTC
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Signer</dt>
          <dd className="body-xs text-[--color-text-muted]">
            {proof.postedBy}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="body-xs">Hash</dt>
          <dd
            className="mono tabular text-xs text-[--color-text]"
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
          className="rounded-[--radius-button] border border-[--color-border-strong] bg-[--color-bg-elevated] px-3 py-1.5 text-xs text-[--color-text] transition-colors duration-[150ms] hover:bg-[--color-bg-tertiary]"
        >
          {uriLabel(proof.uri)}
        </a>
        {proof.txHash ? (
          <a
            href={`https://basescan.org/tx/${proof.txHash}`}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-[--radius-button] border border-[--color-brand] bg-[--color-accent-dim] px-3 py-1.5 text-xs text-[--color-brand] transition-colors duration-[150ms] hover:bg-[--color-accent-subtle]"
          >
            TX on Base
          </a>
        ) : (
          <span
            className="rounded-[--radius-button] border border-dashed border-[--color-border-subtle] px-3 py-1.5 text-xs text-[--color-text-dim]"
            title="Phase 2 will mirror this proof on-chain via the EventLogger contract."
          >
            Off-chain (Phase 1)
          </span>
        )}
      </div>
    </Card>
  );
}
