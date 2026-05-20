// PositionKpis — 4 KPI cards for /portfolio/[positionId]
// Server Component.
// Non-negotiable #1: APY always via <ApyRange>, never single point.
// Non-negotiable #2: ProvenanceBadge on every metric.

import { Metric } from "@/components/ui/metric";
import { ApyRange } from "@/components/ui/apy-range";
import type { PositionDetail } from "@/lib/data/portfolio";

const usdFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface PositionKpisProps {
  position: PositionDetail;
}

/**
 * 4-up KPI grid: Principal · Accrued yield · Distributed to date · Realised APY range.
 * Every metric has a ProvenanceBadge (delegated to the Metric primitive).
 */
export function PositionKpis({ position }: PositionKpisProps) {
  const provenance = position.source === "live" ? "live" : "estimated";

  return (
    <section
      aria-label="Position metrics"
      className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(var(--ct-card-min-w),1fr))]"
    >
      {/* 1 — Principal */}
      <Metric
        label="Principal"
        value={usdFull.format(position.principalUsdc)}
        provenance={provenance}
        sublabel="Deposited"
      />

      {/* 2 — Accrued yield */}
      <Metric
        label="Accrued yield"
        value={usdFull.format(position.accruedYieldUsdc)}
        provenance={provenance}
        sublabel="Pending distribution"
        trend={
          position.accruedYieldUsdc > 0
            ? { direction: "up", text: "Accruing" }
            : undefined
        }
      />

      {/* 3 — Distributed to date */}
      <Metric
        label="Distributed to date"
        value={usdFull.format(position.distributedUsdc)}
        provenance={provenance}
        sublabel="USDC paid out"
      />

      {/* 4 — Realised APY range — non-negotiable #1 */}
      <Metric
        label="Target APY"
        value={
          <ApyRange
            low={position.realizedApyLow}
            high={position.realizedApyHigh}
            precision={1}
          />
        }
        provenance="estimated"
        sublabel="Not guaranteed — indicative range"
      />
    </section>
  );
}
