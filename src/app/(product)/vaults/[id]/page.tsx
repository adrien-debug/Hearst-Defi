// /vaults/[id] — Step 2 of 4: Product details (term sheet preview)
// Server Component. Reads vault by ticker or id. Single vault MVP.
// Non-negotiable #1: APY always range via <ApyRange>.
// Non-negotiable #2: provenance badges on every KPI.
// Non-negotiable #5: no forbidden words in any copy.
// Non-negotiable #9: single vault — no multi-vault UI abstractions.
// Non-negotiable #10: disclaimers + "not guaranteed" present.

import { notFound } from "next/navigation";
import Link from "next/link";

import { getVault } from "@/lib/demo/loaders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApyRange } from "@/components/ui/apy-range";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { StepProgress } from "@/components/vaults/step-progress";
import { TermSheetPreview } from "@/components/vaults/term-sheet-preview";
import { DynamicAllocationCards } from "@/components/vaults/dynamic-allocation-cards";

export const dynamic = "force-dynamic";

// Next.js 16 App Router — params is a Promise
interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  live: "Live",
  review: "In review",
  draft: "Draft",
  paused: "Paused",
  closed: "Closed",
};

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "default" | "danger"
> = {
  live: "success",
  review: "warning",
  draft: "default",
  paused: "warning",
  closed: "danger",
};

export default async function VaultDetailPage({ params }: PageProps) {
  const { id } = await params;
  const vault = await getVault(id);

  if (!vault) notFound();

  const isLive = vault.status === "live";
  const investHref = `/vaults/${id}/invest`;

  return (
    <>
      {/* Page header */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/vaults"
            className="body-sm ct-text-muted hover:ct-text-primary transition-colors"
            aria-label="Back to product list"
          >
            ← Products
          </Link>
        </div>

        <span className="eyebrow">Invest</span>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="h1 flex-1">{vault.name}</h1>
          <div className="flex items-center gap-2 pt-1">
            <span className="ct-pill accent font-mono text-[length:var(--ct-text-micro)]">
              {vault.ticker}
            </span>
            <Badge variant={STATUS_VARIANT[vault.status] ?? "default"}>
              {STATUS_LABEL[vault.status] ?? vault.status}
            </Badge>
          </div>
        </div>

        {/* APY hero row — mandatory range primitive (#1) + provenance (#2) */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="stat-label">Target APY range</span>
            <ProvenanceBadge kind="estimated" />
          </div>
          <ApyRange
            low={vault.apyLow}
            high={vault.apyHigh}
            precision={1}
            className="stat-value text-[length:var(--ct-text-2xl)]"
          />
        </div>

        {/* Step wizard */}
        <div className="pt-1">
          <StepProgress active="product" />
        </div>
      </header>

      {/* Term sheet sections */}
      <TermSheetPreview vault={vault} />

      {/* Dynamic allocation cards — Bull / Sideways / Bear from methodology v1.0 */}
      <section aria-labelledby="sec-regimes">
        <h2 id="sec-regimes" className="ct-section-title mb-4">
          Dynamic allocation — market regimes
        </h2>
        <p className="body-sm ct-text-muted mb-6 max-w-2xl">
          The rule engine adjusts sleeve weights in response to market signals
          without discretionary override. Allocations below reflect target
          postures under each regime, derived from Methodology v1.0.
          APY ranges are conditional on stated assumptions — not a projection.
        </p>
        <DynamicAllocationCards />
      </section>

      {/* Sticky CTA footer */}
      <div
        className="sticky bottom-6 flex items-center justify-between gap-4 ct-card border border-[--ct-border-strong] shadow-[var(--ct-shadow-elevated)]"
        role="navigation"
        aria-label="Invest flow actions"
      >
        <div className="flex flex-col gap-0.5">
          <span className="body-sm font-semibold ct-text-primary">
            {vault.name}
          </span>
          <div className="flex items-center gap-2">
            <ApyRange
              low={vault.apyLow}
              high={vault.apyHigh}
              precision={1}
              className="body-sm font-mono"
            />
            <span className="body-xs ct-text-muted">·</span>
            <span className="body-xs ct-text-muted">
              Min. ${(vault.minTicketUsdc / 1000).toFixed(0)}k ·{" "}
              {vault.softLockupDays}d lock-up
            </span>
          </div>
        </div>

        {isLive ? (
          <Button variant="primary" size="lg" asChild className="font-bold shrink-0">
            <Link href={investHref}>Continue → Deposit</Link>
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            disabled
            aria-disabled
            className="shrink-0"
          >
            Coming soon
          </Button>
        )}
      </div>

      {/* Final disclaimer (#10 — "not guaranteed" mandatory) */}
      <footer>
        <p className="body-xs ct-text-faint max-w-3xl">
          {vault.disclaimers} APY ranges are target projections — they are not
          a projection of future returns and are subject to change without
          notice.
        </p>
      </footer>
    </>
  );
}
