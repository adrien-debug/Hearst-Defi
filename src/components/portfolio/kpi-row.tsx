import { Metric } from "@/components/ui/metric";
import type { Provenance } from "@/components/ui/provenance-badge";
import type { PortfolioData } from "@/lib/data/portfolio";

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

interface KpiRowProps {
  data: PortfolioData;
}

/**
 * Three KPI cards: Portfolio Value · Yield YTD · Next Distribution.
 * ProvenanceBadge on each metric (CLAUDE.md non-negotiable #2).
 */
export function PortfolioKpiRow({ data }: KpiRowProps) {
  const valueProvenance: Provenance =
    data.source === "fallback" ? "stale" : "live";
  const yieldProvenance: Provenance =
    data.source === "fallback" ? "stale" : "estimated";
  const distProvenance: Provenance =
    data.source === "fallback" ? "stale" : "estimated";

  const hasPositions = data.positions.length > 0;

  return (
    <section
      aria-label="Portfolio metrics"
      className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(var(--ct-card-min-w),1fr))]"
    >
      {/* Portfolio Value */}
      <Metric
        label="Portfolio Value"
        value={hasPositions ? usdCompact.format(data.totalValueUsdc) : "—"}
        sublabel="USDC"
        provenance={valueProvenance}
      />

      {/* Yield YTD */}
      <Metric
        label="Yield YTD"
        value={hasPositions ? usdCompact.format(data.totalYieldYtdUsdc) : "—"}
        sublabel="USDC · Accrued + distributed. Not projected forward."
        provenance={yieldProvenance}
      />

      {/* Next Distribution */}
      <Metric
        label="Next Distribution"
        value={monthDayFmt.format(data.nextDistributionAt)}
        sublabel="Monthly cadence · Day 1, T+5"
        provenance={distProvenance}
      />
    </section>
  );
}
