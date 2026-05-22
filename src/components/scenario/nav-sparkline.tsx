import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import type { ScenarioOutput } from "@/lib/engine/types";

// ── NAV projection series ─────────────────────────────────────────────────────
//
// Renders a 12-month projected NAV sparkline from the engine's apy_range.
// The series shows LOW, MID, and HIGH bands.
// All math here is purely display formatting of the engine's output numbers —
// compound interest layout for rendering only (no new business logic).

const INITIAL_NAV = 1_000_000; // illustrative $1M notional
const MONTHS = 12;

interface NavProjection {
  month: number;
  low: number;
  mid: number;
  high: number;
}

function buildNavSeries(
  apyLow: number,
  apyHigh: number,
): NavProjection[] {
  const midApy = (apyLow + apyHigh) / 2;
  const monthlyLow = Math.pow(1 + apyLow / 100, 1 / 12) - 1;
  const monthlyMid = Math.pow(1 + midApy / 100, 1 / 12) - 1;
  const monthlyHigh = Math.pow(1 + apyHigh / 100, 1 / 12) - 1;

  const series: NavProjection[] = [];
  let navLow = INITIAL_NAV;
  let navMid = INITIAL_NAV;
  let navHigh = INITIAL_NAV;

  for (let m = 1; m <= MONTHS; m++) {
    navLow *= 1 + monthlyLow;
    navMid *= 1 + monthlyMid;
    navHigh *= 1 + monthlyHigh;
    series.push({ month: m, low: navLow, mid: navMid, high: navHigh });
  }
  return series;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(3)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NavSparklineProps {
  output: ScenarioOutput;
}

export function NavSparkline({ output }: NavSparklineProps) {
  const series = buildNavSeries(output.apy_range.low, output.apy_range.high);
  const last = series[series.length - 1];

  return (
    <Card>
      <CardHeader className="mb-3">
        <CardTitle>12-Month NAV Projection</CardTitle>
        <ProvenanceBadge kind="estimated" />
      </CardHeader>

      <div className="mb-3 flex flex-wrap items-end gap-6 text-sm">
        <div className="flex flex-col gap-[var(--ct-space-0_5)]">
          <span className="stat-label text-micro">Low band</span>
          <span className="mono font-bold text-[var(--ct-text-body)]">
            {last ? formatUsd(last.low) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-[var(--ct-space-0_5)]">
          <span className="stat-label text-micro">Midpoint</span>
          <span className="mono font-bold text-[var(--ct-text-strong)]">
            {last ? formatUsd(last.mid) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-[var(--ct-space-0_5)]">
          <span className="stat-label text-micro">High band</span>
          <span className="mono font-bold text-[var(--ct-text-body)]">
            {last ? formatUsd(last.high) : "—"}
          </span>
        </div>
        <div className="ml-auto text-micro text-[var(--ct-text-muted)]">
          Notional $1M · 12 months
        </div>
      </div>

      <div className="h-20 w-full ct-empty-state">Chart placeholder</div>

      <div className="mt-3 flex items-center gap-4 text-micro text-[var(--ct-text-muted)]">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full bg-[var(--ct-text-strong)] opacity-85"
          />
          Midpoint
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full bg-[var(--ct-text-strong)] opacity-35 border-t border-dashed border-[var(--ct-text-strong)]"
          />
          Low / High range
        </span>
      </div>
    </Card>
  );
}
