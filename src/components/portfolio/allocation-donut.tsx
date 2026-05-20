import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import type { PortfolioPosition } from "@/lib/data/portfolio";

/**
 * Allocation donut — SVG with r=15.9155 (C≈100) convention.
 * dasharray = `${arc} ${C - arc}` (DESIGN_SYSTEM §5 — no arcs fantômes).
 * SVG is square (viewBox 42×42, rendered 200×200) — no ellipse distortion.
 */

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  matured: "Matured",
  exited: "Exited",
};

const STATUS_LEGEND_TONE: Record<string, "primary" | "accent" | "muted"> = {
  active: "primary",
  matured: "muted",
  exited: "accent",
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
    dashArray: string;
    dashOffset: number;
  }> = [];

  let cumulative = 0;
  for (const [status, value] of grouped.entries()) {
    const pct = totalValueUsdc > 0 ? (value / totalValueUsdc) * 100 : 0;
    const dashArray = `${pct} ${100 - pct}`;
    segments.push({ status, pct, valueUsdc: value, dashArray, dashOffset: -cumulative });
    cumulative += pct;
  }

  return (
    <article className="dash-cell col-4" aria-label="Portfolio allocation">
      <div className="dash-label">
        <span>Allocation by status</span>
        <ProvenanceBadge kind={provenance} />
      </div>

      <div className="flex flex-col items-center gap-4 mt-2">
        <div className="dash-chart-container mt-0 w-[var(--ct-donut-size)] h-[var(--ct-donut-size)]">
          <svg
            className="dash-chart-svg"
            viewBox="0 0 42 42"
            width="200"
            height="200"
            aria-hidden="true"
          >
            {/* Background track */}
            <circle
              className="dash-chart-circle color-muted"
              cx="21"
              cy="21"
              r="15.9155"
              strokeDasharray="100 0"
            />
            {segments.map((s) => (
              <circle
                key={s.status}
                className={`dash-chart-circle color-${STATUS_LEGEND_TONE[s.status] ?? "muted"}`}
                cx="21"
                cy="21"
                r="15.9155"
                strokeDasharray={s.dashArray}
                strokeDashoffset={s.dashOffset}
              />
            ))}
          </svg>
          <div className="donut-center">
            <span className="donut-val">
              {totalValueUsdc > 0 ? usdCompact.format(totalValueUsdc) : "—"}
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
                {s.pct.toFixed(0)}% · {usdCompact.format(s.valueUsdc)}
              </span>
            </div>
          ))}
          {segments.length === 0 && (
            <span className="dash-legend-left text-[--ct-text-muted]">
              No positions
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
