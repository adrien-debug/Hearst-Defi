import Link from "next/link";

import { ApyRange } from "@/components/ui/apy-range";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import type { VaultProduct } from "@/lib/data/vaults";

const STRATEGY_LABELS: Record<VaultProduct["strategy"], string> = {
  mining_yield: "Mining Yield",
  btc_tactical: "BTC Tactical",
  stable_reserve: "Stable Reserve",
};

const RISK_LABELS: Record<VaultProduct["riskLevel"], string> = {
  low: "Low risk",
  "low-moderate": "Low–Moderate",
  moderate: "Moderate",
  high: "High",
};

const STATUS_VARIANT: Record<
  VaultProduct["status"],
  "success" | "warning" | "default" | "danger"
> = {
  live: "success",
  review: "warning",
  draft: "default",
  paused: "warning",
  closed: "danger",
};

const USD_COMPACT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

interface ProductSelectCardProps {
  vault: VaultProduct;
}

/**
 * Card shown in the /vaults grid — Step 1 of 4.
 * Server Component. Uses locked DS primitives only.
 * APY always via <ApyRange> (non-negotiable #1).
 * Provenance badge on the APY metric (non-negotiable #2).
 */
export function ProductSelectCard({ vault }: ProductSelectCardProps) {
  const isLive = vault.status === "live";
  const href = `/vaults/${vault.ticker.toLowerCase()}`;

  return (
    <Card
      className="flex flex-col gap-8 md:flex-row md:gap-10"
      aria-label={`${vault.name} — ${STRATEGY_LABELS[vault.strategy]}`}
    >
      {/* Left column — identity, APY, description */}
      <div className="flex flex-1 flex-col gap-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col gap-2 min-w-0">
          <h2 className="h3 truncate">{vault.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="ct-pill accent mono text-xs">{vault.ticker}</span>
            <Badge variant={STATUS_VARIANT[vault.status]}>
              {vault.status === "live"
                ? "Live"
                : vault.status === "review"
                  ? "In review"
                  : vault.status === "draft"
                    ? "Draft"
                    : vault.status === "paused"
                      ? "Paused"
                      : "Closed"}
            </Badge>
          </div>
        </div>

        {/* APY range — mandatory primitive, provenance badge mandatory (#2) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="stat-label">Target APY range</span>
            <ProvenanceBadge kind="estimated" />
          </div>
          <div className="flex items-baseline gap-1">
            <ApyRange
              low={vault.apyLow}
              high={vault.apyHigh}
              precision={1}
              className="stat-value"
            />
          </div>
          <p className="body-xs ct-text-muted">
            Conditional on stated assumptions · not a projection of future
            results
          </p>
        </div>

        {/* Strategy description */}
        <p className="body-sm ct-text-body line-clamp-3">{vault.description}</p>
      </div>

      {/* Right column — metrics grid + CTA */}
      <div className="flex flex-col gap-8 pt-8 border-t border-[var(--ct-border-soft)] md:w-[300px] md:shrink-0 md:pt-0 md:pl-10 md:border-t-0 md:border-l">
        <div className="grid grid-cols-2 items-start gap-x-8 gap-y-6">
          <div className="flex flex-col gap-1">
            <span className="stat-label">Min. ticket</span>
            <span className="tabular text-base font-semibold ct-text-strong whitespace-nowrap">
              {USD_COMPACT.format(vault.minTicketUsdc)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="stat-label">Soft lock-up</span>
            <span className="tabular text-base font-semibold ct-text-strong whitespace-nowrap">
              {vault.softLockupDays}d
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="stat-label">Risk level</span>
            <span className="text-base font-semibold ct-text-strong whitespace-nowrap">
              {RISK_LABELS[vault.riskLevel]}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="stat-label">AUM</span>
            <span className="tabular text-base font-semibold ct-text-strong whitespace-nowrap">
              {USD_COMPACT.format(vault.currentAumUsdc)}
            </span>
          </div>
        </div>

        {/* CTA — compact, aligned bottom-right */}
        <div className="mt-auto flex justify-end">
          {isLive ? (
            <Button variant="primary" size="md" asChild className="font-bold">
              <Link href={href} aria-label={`View details for ${vault.name}`}>
                Select →
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" size="md" disabled aria-disabled>
              Coming soon
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
