import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import type { PortfolioPosition } from "@/lib/data/portfolio";
import { formatUsdCompact } from "@/lib/format/usd-compact";

/**
 * Allocation donut — SVG removed, placeholder only.
 */

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  matured: "Matured",
  exited: "Exited",
};

const STATUS_LEGEND_TONE: Record<string, "primary" | "accent" | "accent-raw"> = {
  active: "primary",
  matured: "accent",
  exited: "accent-raw",
};

interface AllocationDonutProps {
  positions: PortfolioPosition[];
  totalValueUsdc: number;
  source: "live" | "fallback";
}

export function AllocationDonut({
  positions,
  totalValueUsdc,
  source,
}: AllocationDonutProps) {
  const provenance = source === "fallback" ? "stale" : "live";

  // Group by status for the donut arcs.
  type StatusKey = "active" | "matured" | "exited";
  const grouped = new Map<StatusKey, number>();
  for (const p of positions) {
    grouped.set(p.status, (grouped.get(p.status) ?? 0) + p.valueUsdc);
  }

  const segments: Array<{
    status: StatusKey;
    pct: number;
    valueUsdc: number;
  }> = [];

  for (const [status, value] of grouped.entries()) {
    const pct = totalValueUsdc > 0 ? (value / totalValueUsdc) * 100 : 0;
    segments.push({ status, pct, valueUsdc: value });
  }

  return (
    <article className="dash-cell" aria-label="Portfolio allocation">
      <div className="dash-label">
        <span>Allocation by status</span>
        <ProvenanceBadge kind={provenance} />
      </div>

      <div className="flex flex-col items-center gap-4 mt-2">
        <div className="dash-chart-container mt-0 w-[var(--ct-donut-size)] h-[var(--ct-donut-size)]">
          <div className="dash-chart-svg w-full h-full rounded-full bg-[var(--ct-surface-1)] border border-[var(--ct-border-soft)]" />
          <div className="donut-center">
            <span className="donut-val">
              {totalValueUsdc > 0 ? formatUsdCompact(totalValueUsdc) : "—"}
            </span>
            <span className="donut-lbl">Portfolio</span>
          </div>
        </div>

        <div className="dash-legend w-full mt-0">
          {segments.map((s) => (
            <div key={s.status} className="dash-legend-row">
              <span className="dash-legend-left">
                <span
                  className={`dash-legend-dot dot-${STATUS_LEGEND_TONE[s.status] ?? "muted"}`}
                />
                {STATUS_LABELS[s.status] ?? s.status}
              </span>
              <span className="dash-legend-val">
                {s.pct.toFixed(0)}% · {formatUsdCompact(s.valueUsdc)}
              </span>
            </div>
          ))}
          {segments.length === 0 && (
            <span className="dash-legend-left text-[var(--ct-text-muted)]">
              No positions
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
