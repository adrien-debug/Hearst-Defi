import { ProvenanceBadge, type Provenance } from "@/components/ui/provenance-badge";
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "var(--ct-space-4)",
      }}
    >
      {/* Portfolio Value */}
      <article className="dash-cell" aria-label="Portfolio value">
        <div className="dash-label">
          <span>Portfolio Value</span>
          <ProvenanceBadge kind={valueProvenance} />
        </div>
        <div className="dash-value-group">
          <span className="dash-value">
            {hasPositions ? usdCompact.format(data.totalValueUsdc) : "—"}
          </span>
          <span className="dash-unit">USDC</span>
        </div>
      </article>

      {/* Yield YTD */}
      <article className="dash-cell" aria-label="Yield year to date">
        <div className="dash-label">
          <span>Yield YTD</span>
          <ProvenanceBadge kind={yieldProvenance} />
        </div>
        <div className="dash-value-group">
          <span className="dash-value">
            {hasPositions ? usdCompact.format(data.totalYieldYtdUsdc) : "—"}
          </span>
          <span className="dash-unit">USDC</span>
        </div>
        <p
          className="body-xs"
          style={{
            color: "var(--ct-text-muted)",
            marginTop: "var(--ct-space-2)",
            fontStyle: "italic",
          }}
        >
          Accrued + distributed. Not projected forward.
        </p>
      </article>

      {/* Next Distribution */}
      <article className="dash-cell" aria-label="Next distribution date">
        <div className="dash-label">
          <span>Next Distribution</span>
          <ProvenanceBadge kind={distProvenance} />
        </div>
        <div className="dash-value-group">
          <span
            className="dash-value-range"
            style={{ fontSize: "var(--ct-text-3xl)" }}
          >
            {monthDayFmt.format(data.nextDistributionAt)}
          </span>
        </div>
        <p
          className="body-xs"
          style={{
            color: "var(--ct-text-muted)",
            marginTop: "var(--ct-space-2)",
          }}
        >
          Monthly cadence · Day 1, T+5
        </p>
      </article>
    </div>
  );
}
