import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProofPulseProps {
  lastPor: {
    timestamp: Date;
    statedTvlUsdc: number;
    onChainTvlUsdc: number;
  };
  methodologyVersion: string; // e.g. "v1.0"
  methodologyLocked: boolean;
  nextAttestation: Date | null;
  auditor: string;
  proofCenterHref?: string; // defaults to "/proof-center"
}

// ── Pure helpers (exported for tests) ────────────────────────────────────────

/** Absolute delta between stated and on-chain TVL as a percentage. */
export function computeDeltaPct(
  statedTvlUsdc: number,
  onChainTvlUsdc: number,
): number {
  if (statedTvlUsdc === 0) return 0;
  return (Math.abs(statedTvlUsdc - onChainTvlUsdc) / statedTvlUsdc) * 100;
}

/** Whether the PoR passes the match threshold (delta < 0.5%). */
export function isMatch(deltaPct: number): boolean {
  return deltaPct < 0.5;
}

type DeltaLevel = "green" | "orange" | "red";

export function deltaLevel(deltaPct: number): DeltaLevel {
  if (deltaPct < 0.5) return "green";
  if (deltaPct < 2) return "orange";
  return "red";
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatUsdc(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 1,
    notation: "compact",
    compactDisplay: "short",
  }).format(amount);
}

function formatDateHuman(date: Date): string {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatTimeUtc(date: Date): string {
  return date
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false,
    })
    .concat(" UTC");
}

function formatIso(date: Date): string {
  return date.toISOString();
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface DataRowProps {
  label: string;
  children: React.ReactNode;
}

function DataRow({ label, children }: DataRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[var(--ct-border-soft)] last:border-0">
      <span className="body-xs ct-text-muted shrink-0">{label}</span>
      <span className="body-sm mono tabular-nums ct-text-primary text-right">
        {children}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProofPulse({
  lastPor,
  methodologyVersion,
  methodologyLocked,
  nextAttestation,
  auditor,
  proofCenterHref = "/proof-center",
}: ProofPulseProps) {
  const { timestamp, statedTvlUsdc, onChainTvlUsdc } = lastPor;

  const deltaPct = computeDeltaPct(statedTvlUsdc, onChainTvlUsdc);
  const matched = isMatch(deltaPct);
  const level = deltaLevel(deltaPct);

  const deltaColorClass = cn({
    "text-[var(--ct-status-success)]": level === "green",
    "text-[var(--ct-status-warning)]": level === "orange",
    "text-[var(--ct-status-danger)]": level === "red",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proof &amp; Methodology Pulse</CardTitle>
        <div className="flex items-center gap-2">
          <ProvenanceBadge kind="attested" />
          <ProvenanceBadge kind="oracle" />
        </div>
      </CardHeader>

      {/* ── Last PoR block ─────────────────────────────────────────────────── */}
      <section aria-label="Last Proof of Reserves">
        <h4 className="body-xs font-semibold uppercase tracking-[var(--ct-tracking-wide)] ct-text-muted mb-3">
          Last PoR
          <time
            dateTime={formatIso(timestamp)}
            className="ml-2 font-normal normal-case tracking-normal ct-text-faint"
          >
            {formatDateHuman(timestamp)} · {formatTimeUtc(timestamp)}
          </time>
        </h4>

        <div className="rounded-[var(--ct-radius-lg)] glass-panel-subtle px-4 py-1">
          <DataRow label="Vault TVL">{formatUsdc(statedTvlUsdc)}</DataRow>

          <DataRow label="On-chain">
            <span className="flex items-center justify-end gap-2">
              {formatUsdc(onChainTvlUsdc)}
              <span
                role="status"
                aria-label={
                  matched
                    ? "On-chain TVL matches stated TVL"
                    : "On-chain TVL mismatch detected"
                }
                className={cn(
                  "text-[length:var(--ct-text-sm)] font-bold leading-none select-none",
                  matched
                    ? "text-[var(--ct-status-success)]"
                    : "text-[var(--ct-status-danger)]",
                )}
              >
                {matched ? "✓" : "✗"}
              </span>
            </span>
          </DataRow>

          <DataRow label="Delta">
            <span className={deltaColorClass}>
              {deltaPct === 0 ? "0.00" : deltaPct.toFixed(2)}%
            </span>
          </DataRow>
        </div>
      </section>

      {/* ── Methodology block ──────────────────────────────────────────────── */}
      <section aria-label="Methodology" className="mt-6">
        <h4 className="body-xs font-semibold uppercase tracking-[var(--ct-tracking-wide)] ct-text-muted mb-3">
          Methodology
        </h4>

        <div className="rounded-[var(--ct-radius-lg)] glass-panel-subtle px-4 py-1">
          <DataRow label="Version">
            <span className="flex items-center justify-end gap-2">
              <span className="ct-text-faint">{methodologyVersion}</span>
              {methodologyLocked && (
                <Badge variant="default" aria-label="Methodology is locked">
                  locked
                </Badge>
              )}
            </span>
          </DataRow>

          <DataRow label="Next attest">
            {nextAttestation !== null ? (
              <time dateTime={formatIso(nextAttestation)}>
                {formatDateHuman(nextAttestation)} ·{" "}
                {formatTimeUtc(nextAttestation)}
              </time>
            ) : (
              <span className="ct-text-faint italic">no scheduled</span>
            )}
          </DataRow>

          <DataRow label="Auditor">{auditor}</DataRow>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <div className="mt-6 flex justify-end">
        <Link
          href={proofCenterHref}
          className="body-xs ct-text-muted hover:ct-text-primary transition-colors underline underline-offset-2 decoration-[var(--ct-border)]"
          aria-label="Open proof center"
        >
          open proof center →
        </Link>
      </div>
    </Card>
  );
}
