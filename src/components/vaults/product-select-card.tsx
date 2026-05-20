import Link from "next/link";

import { ApyRange } from "@/components/ui/apy-range";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <article
      className="ct-card flex flex-col gap-4"
      aria-label={`${vault.name} — ${STRATEGY_LABELS[vault.strategy]}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="h3 truncate">{vault.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="ct-pill accent font-mono text-xs">
              {vault.ticker}
            </span>
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
      </div>

      {/* APY range — mandatory primitive, provenance badge mandatory (#2) */}
      <div className="flex flex-col gap-1">
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
          Conditional on stated assumptions · not a projection of future results
        </p>
      </div>

      {/* Key metrics row */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 border-t border-[--ct-border-soft]">
        <div className="flex flex-col gap-0.5">
          <span className="stat-label">Min. ticket</span>
          <span className="stat-value tabular text-sm">
            {USD_COMPACT.format(vault.minTicketUsdc)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="stat-label">Soft lock-up</span>
          <span className="stat-value tabular text-sm">
            {vault.softLockupDays}d
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="stat-label">Risk level</span>
          <span className="stat-value text-sm">
            {RISK_LABELS[vault.riskLevel]}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="stat-label">AUM</span>
          <span className="stat-value tabular text-sm">
            {USD_COMPACT.format(vault.currentAumUsdc)}
          </span>
        </div>
      </div>

      {/* Strategy description */}
      <p className="body-sm ct-text-body line-clamp-3">{vault.description}</p>

      {/* CTA */}
      <div className="mt-auto pt-2">
        {isLive ? (
          <Button variant="primary" size="md" asChild className="w-full font-bold">
            <Link href={href} aria-label={`View details for ${vault.name}`}>
              Select →
            </Link>
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="md"
            disabled
            aria-disabled
            className="w-full"
          >
            Coming soon
          </Button>
        )}
      </div>
    </article>
  );
}
