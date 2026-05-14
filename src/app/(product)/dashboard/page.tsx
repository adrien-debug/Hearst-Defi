import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AllocationSection } from "@/components/dashboard/allocation-section";
import { BtcTacticalSection } from "@/components/dashboard/btc-tactical";
import { HeroMetrics } from "@/components/dashboard/hero-metrics";
import { MiningHealthSection } from "@/components/dashboard/mining-health";
import { getDashboardSnapshot } from "@/lib/mock/dashboard";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const snapshot = getDashboardSnapshot();
  const asOf = new Date(snapshot.asOf);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Hearst Yield Vault</p>
          <h1 className="h1">Dashboard</h1>
        </div>
        <span className="mono tabular text-xs text-[--color-text-dim]">
          as of{" "}
          {asOf.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          })}{" "}
          UTC
        </span>
      </header>

      <HeroMetrics snapshot={snapshot} />

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <AllocationSection
            allocations={snapshot.allocations}
            blendedYieldRange={snapshot.blendedYieldRange}
          />
        </div>
        <MiningHealthSection miningHealth={snapshot.miningHealth} />
      </div>

      <BtcTacticalSection btcTactical={snapshot.btcTactical} />

      <ActivityFeed events={snapshot.recentEvents} />

      <footer className="border-t border-[--color-border-subtle] pt-6">
        <p className="body-xs">
          Projections are conditional on the assumptions stated in Methodology
          v1.0. APY ranges are not guaranteed; past performance does not predict
          future returns. Mining cashflow is paper at Phase 1,
          partner-attested from Phase 2.
        </p>
      </footer>
    </div>
  );
}
