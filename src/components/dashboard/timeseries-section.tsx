import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ApyRange } from "@/components/ui/apy-range";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import type {
  DashboardTimeseries,
} from "@/lib/data/dashboard";

const METHODOLOGY_TARGET_APY = 12;

interface TimeseriesSectionProps {
  data: DashboardTimeseries;
}

export function TimeseriesSection({ data }: TimeseriesSectionProps) {
  const provenance = data.source === "fallback" ? "estimated" : "live";
  return (
    <section
      aria-label="30-day trailing time-series"
      className="grid gap-8 lg:grid-cols-2"
    >
      <NavChart points={data.nav30d} provenance={provenance} />
      <ApyChart points={data.apy30d} provenance={provenance} />
    </section>
  );
}

interface NavPoint {
  date: string;
  aum_usdc: number;
}

interface NavChartProps {
  points: NavPoint[];
  provenance: import("@/components/ui/provenance-badge").Provenance;
}

interface ChartEmptyProps {
  title: string;
  subtitle: string;
  provenance: import("@/components/ui/provenance-badge").Provenance;
}

function ChartEmpty({ title, subtitle, provenance }: ChartEmptyProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle>{title}</CardTitle>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ct-text-muted)]">
            {subtitle}
          </p>
        </div>
        <ProvenanceBadge kind={provenance === "live" ? "stale" : provenance} />
      </CardHeader>
      <div className="flex-1 min-h-[var(--ct-chart-empty-h)] flex items-center justify-center text-center -mx-4 -mb-4 mt-4 rounded-b-[var(--ct-radius-lg)] border border-dashed border-[var(--ct-border-soft)] bg-[var(--ct-surface-1)]">
        <p className="text-xs text-[var(--ct-text-muted)] px-6 py-8">
          No historical data yet — first snapshot needed.
        </p>
      </div>
    </Card>
  );
}

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function NavChart({ points, provenance }: NavChartProps) {
  if (points.length === 0) {
    return (
      <ChartEmpty
        title="Net Asset Value"
        subtitle="Trailing 30 days · USDC"
        provenance={provenance}
      />
    );
  }

  const values = points.map((p) => p.aum_usdc);
  const last = values[values.length - 1] ?? 0;
  const first = values[0] ?? 0;
  const deltaPct = first === 0 ? 0 : ((last - first) / first) * 100;
  const trendDir: "up" | "down" | "flat" =
    deltaPct > 0.05 ? "up" : deltaPct < -0.05 ? "down" : "flat";

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle>Net Asset Value</CardTitle>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ct-text-muted)]">
            Trailing 30 days · USDC
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-3xl font-semibold tabular-nums leading-tight text-[var(--ct-text-primary)] drop-shadow-[var(--ct-glow-subtle)]">
            {usdCompact.format(last)}
          </span>
          <div className="flex items-center gap-3">
            <span
              className={
                "mono tabular-nums text-sm font-medium px-2 py-0.5 rounded-[var(--ct-radius-md)] backdrop-blur-md " +
                (trendDir === "up"
                  ? "ct-status-success-bg"
                  : trendDir === "down"
                    ? "ct-status-danger-bg"
                    : "ct-surface-1 ct-text-body ct-border-base")
              }
            >
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(1)}% (30d)
            </span>
            <ProvenanceBadge kind={provenance} />
          </div>
        </div>
      </CardHeader>

      <div className="flex-1 min-h-[var(--ct-chart-empty-h)] relative -mx-4 -mb-4 mt-4 ct-empty-state">
        Chart placeholder
      </div>
    </Card>
  );
}

interface ApyPoint {
  date: string;
  apy_low: number;
  apy_high: number;
}

interface ApyChartProps {
  points: ApyPoint[];
  provenance: import("@/components/ui/provenance-badge").Provenance;
}

function ApyChart({ points, provenance }: ApyChartProps) {
  if (points.length === 0) {
    return (
      <ChartEmpty
        title="APY Range"
        subtitle={`Trailing 30d · Target ${METHODOLOGY_TARGET_APY.toFixed(0)}%`}
        provenance={provenance}
      />
    );
  }

  const lastPoint = points[points.length - 1];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle>APY Range</CardTitle>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ct-text-muted)]">
            Trailing 30d · Target {METHODOLOGY_TARGET_APY.toFixed(0)}%
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {lastPoint ? (
            <ApyRange
              className="text-3xl leading-tight"
              low={lastPoint.apy_low}
              high={lastPoint.apy_high}
            />
          ) : null}
          <ProvenanceBadge kind={provenance} />
        </div>
      </CardHeader>

      <div className="flex-1 min-h-[var(--ct-chart-empty-h)] relative -mx-4 -mb-4 mt-4 ct-empty-state">
        Chart placeholder
      </div>
    </Card>
  );
}
