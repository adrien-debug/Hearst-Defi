import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { EXPLORER_TX_BASE } from "@/lib/chain/client";
import type { EventKind, OnChainEvent } from "@/lib/chain/event-logger";
import { cn } from "@/lib/cn";

interface EventTimelineProps {
  events: ReadonlyArray<OnChainEvent>;
}

const KIND_LABEL: Record<EventKind, string> = {
  Rebalance: "Rebalance",
  Distribution: "Distribution",
  ModeChange: "Mode change",
  GuardrailBreach: "Guardrail breach",
  TriggerArmed: "Trigger armed",
  AttestationPublished: "Attestation published",
};

const KIND_VARIANT: Record<
  EventKind,
  "success" | "brand" | "warning" | "danger" | "default"
> = {
  Rebalance: "brand",
  Distribution: "success",
  ModeChange: "default",
  GuardrailBreach: "danger",
  TriggerArmed: "warning",
  AttestationPublished: "brand",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
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

function ipfsGatewayUrl(cid: string): string {
  if (cid.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${cid.slice(7)}`;
  if (cid.startsWith("https://") || cid.startsWith("http://")) return cid;
  return `https://ipfs.io/ipfs/${cid}`;
}

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <span className="eyebrow">On-chain event log</span>
          <CardTitle>EventLogger — last {events.length} events</CardTitle>
        </div>
        <ProvenanceBadge kind={events.length > 0 ? "attested" : "manual"} />
      </CardHeader>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <svg
            className="h-10 w-10 text-[--ct-text-muted]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="body-sm">
            No on-chain events yet. Contracts are live on Base Sepolia — events
            appear here as the vault operates.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-0" aria-label="On-chain event timeline">
          {events.map((event, idx) => (
            <li
              key={`${event.eventId.toString()}-${event.txHash}`}
              className={cn(
                "relative flex gap-5 pb-8",
                // Suppress timeline line after last item
                idx < events.length - 1 &&
                  "before:absolute before:left-[0.8125rem] before:top-7 before:bottom-0 before:w-px before:bg-[--ct-border-soft]",
              )}
            >
              {/* Timeline dot */}
              <div className="relative mt-1 flex h-7 w-7 shrink-0 items-center justify-center">
                <span
                  className={cn(
                    "h-3 w-3 rounded-full border-2 border-[--ct-surface-2]",
                    event.kind === "GuardrailBreach"
                      ? "bg-[--ct-status-danger]"
                      : event.kind === "Distribution"
                        ? "bg-[--ct-status-success]"
                        : event.kind === "TriggerArmed"
                          ? "bg-[--ct-status-warning]"
                          : "bg-[--ct-text-strong]",
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={KIND_VARIANT[event.kind]}>
                    {KIND_LABEL[event.kind]}
                  </Badge>
                  <span className="body-xs">
                    Event #{event.eventId.toString()}
                  </span>
                </div>

                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  <dt className="text-[--ct-text-muted]">Timestamp</dt>
                  <dd className="text-[--ct-text-body]">
                    {dateFmt.format(event.timestamp)} UTC
                  </dd>

                  <dt className="text-[--ct-text-muted]">Block</dt>
                  <dd className="mono tabular text-[--ct-text-body]">
                    {event.blockNumber.toString()}
                  </dd>

                  <dt className="text-[--ct-text-muted]">Publisher</dt>
                  <dd
                    className="mono tabular text-[--ct-text-body]"
                    title={event.publisher}
                  >
                    {truncateAddress(event.publisher)}
                  </dd>

                  <dt className="text-[--ct-text-muted]">Tx hash</dt>
                  <dd
                    className="mono tabular text-[--ct-text-primary]"
                    title={event.txHash}
                  >
                    <a
                      href={`${EXPLORER_TX_BASE}${event.txHash}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hover:text-[--ct-text-strong] transition-colors duration-[var(--ct-dur-fast)]"
                    >
                      {truncateHash(event.txHash)}
                    </a>
                  </dd>

                  <dt className="text-[--ct-text-muted]">Context hash</dt>
                  <dd
                    className="mono tabular text-[--ct-text-muted]"
                    title={event.contextHash}
                  >
                    {truncateHash(event.contextHash)}
                  </dd>
                </dl>

                {event.payloadCid.length > 0 ? (
                  <div className="mt-1">
                    <a
                      href={ipfsGatewayUrl(event.payloadCid)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={cn(
                        "rounded-[--ct-radius-full] border border-[--ct-border-strong] bg-[--ct-surface-1]",
                        "px-3 py-1 text-xs text-[--ct-text-primary]",
                        "transition-colors duration-[var(--ct-dur-fast)] hover:bg-[--ct-surface-3]",
                        "focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]",
                      )}
                    >
                      View payload (IPFS)
                    </a>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
