import { ApyRange } from "@/components/ui/apy-range";
import { Metric } from "@/components/ui/metric";
import type { DashboardSnapshot } from "@/lib/mock/dashboard";

interface HeroMetricsProps {
  snapshot: DashboardSnapshot;
}

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const usdShort = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 0,
});

export function HeroMetrics({ snapshot }: HeroMetricsProps) {
  const delta30d = snapshot.aum.delta30dUsd;
  const aumTrendDirection: "up" | "down" | "flat" =
    delta30d > 0 ? "up" : delta30d < 0 ? "down" : "flat";

  return (
    <section
      aria-label="Vault hero metrics"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <Metric
        label="AUM"
        value={usdCompact.format(snapshot.aum.valueUsd)}
        provenance={snapshot.aum.provenance}
        trend={{
          direction: aumTrendDirection,
          text: `${delta30d >= 0 ? "+" : "−"}${usdShort.format(Math.abs(delta30d)).replace("$", "$")} (30d)`,
        }}
        tooltip="Assets Under Management. Total USDC equivalent of all vault holdings, marked to market."
      />
      <Metric
        label="APY range"
        value={
          <ApyRange
            low={snapshot.currentApyRange.low}
            high={snapshot.currentApyRange.high}
          />
        }
        sublabel="forward 12m · conditional · not guaranteed"
        provenance={snapshot.apyProvenance}
        tooltip="Forward 12m projected APY range, calculated from current allocation × asset-class yield assumptions. Not guaranteed. Methodology v1.0."
      />
      <Metric
        label="Stressed APY"
        value={`${snapshot.stressedApy.toFixed(1)}%`}
        sublabel={snapshot.stressedScenarioLabel}
        provenance={snapshot.stressedProvenance}
        tooltip="Projected APY under combined Bear scenario (BTC −40%, hashprice −30%). Conditional projection."
      />
      <Metric
        label="Risk Score"
        value={`${snapshot.riskScore.value}/100`}
        sublabel={snapshot.riskScore.bandLabel}
        provenance={snapshot.riskScore.provenance}
        tooltip="Composite score (Market, Mining, Liquidity, Smart Contract, Counterparty). Lower = lower risk."
      />
      <Metric
        label="Next distribution"
        value={snapshot.nextDistribution.dateLabel}
        sublabel={`~${usdShort.format(snapshot.nextDistribution.estimateUsd)}`}
        provenance={snapshot.nextDistribution.provenance}
        tooltip="Next monthly USDC distribution. Estimate from current mining margin + base yield accrual."
      />
    </section>
  );
}
