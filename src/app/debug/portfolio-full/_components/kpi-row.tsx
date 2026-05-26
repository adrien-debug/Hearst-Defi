import type { PortfolioData } from "@/lib/data/portfolio";
import { cn } from "@/lib/cn";
import { formatUsdCompact } from "@/lib/format/usd-compact";

import { ProvenanceBadge, type Provenance } from "./provenance-badge";

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

interface KpiRowProps {
  data: PortfolioData;
}

export function PortfolioKpiRow({ data }: KpiRowProps) {
  const valueProvenance: Provenance =
    data.source === "fallback" ? "stale" : "live";
  const yieldProvenance: Provenance =
    data.source === "fallback" ? "stale" : "estimated";
  const distProvenance: Provenance =
    data.source === "fallback" ? "stale" : "estimated";

  const hasPositions = data.positions.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <article className="bg-[var(--ct-surface-1)] border border-[var(--ct-border-soft)] rounded-sm p-6 flex flex-col relative min-h-[140px]" aria-label="Portfolio value">
        <div className="flex justify-between items-center text-micro font-medium text-[var(--ct-text-muted)] tracking-widest uppercase mb-6">
          <span>Portfolio Value</span>
          <ProvenanceBadge kind={valueProvenance} />
        </div>
        <div className="flex items-baseline mt-auto">
          <span className="mono text-4xl font-light text-[var(--ct-text-strong)] tracking-tighter leading-none tabular-nums truncate">
            {hasPositions ? formatUsdCompact(data.totalValueUsdc) : <span className="opacity-30">—</span>}
          </span>
          <span className="font-sans text-micro text-[var(--ct-text-muted)] font-medium uppercase tracking-widest opacity-50 ml-1.5">USDC</span>
        </div>
        <div className="mt-2 h-4">
          {hasPositions && data.pnl ? (
            <p
              className={cn(
                "text-xs mono leading-4 uppercase tracking-wider",
                data.pnl.netReturnPct >= 0
                  ? "text-[var(--ct-accent)]"
                  : "text-[var(--ct-status-danger)]",
              )}
            >
              {data.pnl.netReturnPct >= 0 ? "+" : ""}
              {data.pnl.netReturnPct.toFixed(1)}% net return
            </p>
          ) : null}
        </div>
      </article>

      <article className="bg-[var(--ct-surface-1)] border border-[var(--ct-border-soft)] rounded-sm p-6 flex flex-col relative min-h-[140px]" aria-label="Yield year to date">
        <div className="flex justify-between items-center text-micro font-medium text-[var(--ct-text-muted)] tracking-widest uppercase mb-6">
          <span>Yield YTD</span>
          <ProvenanceBadge kind={yieldProvenance} />
        </div>
        <div className="flex items-baseline mt-auto">
          <span className="mono text-4xl font-light text-[var(--ct-text-strong)] tracking-tighter leading-none tabular-nums truncate">
            {hasPositions ? formatUsdCompact(data.totalYieldYtdUsdc) : <span className="opacity-30">—</span>}
          </span>
          <span className="font-sans text-micro text-[var(--ct-text-muted)] font-medium uppercase tracking-widest opacity-50 ml-1.5">USDC</span>
        </div>
        <div className="mt-2 h-4">
          <p className="text-xs text-[var(--ct-text-muted)] mono uppercase tracking-wider leading-4 truncate opacity-70">
            Accrued + distributed
          </p>
        </div>
      </article>

      <article className="bg-[var(--ct-surface-1)] border border-[var(--ct-border-soft)] rounded-sm p-6 flex flex-col relative min-h-[140px]" aria-label="Next distribution date">
        <div className="flex justify-between items-center text-micro font-medium text-[var(--ct-text-muted)] tracking-widest uppercase mb-6">
          <span>Next Distribution</span>
          <ProvenanceBadge kind={distProvenance} />
        </div>
        <div className="flex items-baseline mt-auto">
          <span className="mono text-4xl font-light text-[var(--ct-text-strong)] tracking-tighter leading-none tabular-nums truncate">
            {monthDayFmt.format(data.nextDistributionAt)}
          </span>
        </div>
        <div className="mt-2 h-4">
          <p className="text-xs text-[var(--ct-text-muted)] mono uppercase tracking-wider leading-4 truncate opacity-70">
            Monthly · Day 1, T+5
          </p>
        </div>
      </article>
    </div>
  );
}
