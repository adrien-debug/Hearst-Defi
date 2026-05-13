import Link from "next/link";

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
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/hearst-connect.svg"
            alt="Hearst Connect"
            className="h-8 w-auto"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-dim]">
              Hearst Yield Vault
            </p>
            <h1 className="text-2xl font-medium leading-tight">Dashboard</h1>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 text-xs text-[--color-text-muted] sm:items-end">
          <span className="font-mono tabular-nums">
            as of{" "}
            {asOf.toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "UTC",
            })}{" "}
            UTC
          </span>
          <Link
            href="/admin/roadmap"
            className="text-[--color-text-muted] underline-offset-4 hover:text-[--color-text] hover:underline"
          >
            Admin → Roadmap
          </Link>
        </div>
      </header>

      <div className="space-y-8">
        <HeroMetrics snapshot={snapshot} />

        <div className="grid gap-6 lg:grid-cols-3">
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

        <footer className="border-t border-[--color-border-subtle] pt-6 text-xs text-[--color-text-dim]">
          <p>
            Projections are conditional on the assumptions stated in
            Methodology v1.0. APY ranges are not guaranteed; past performance
            does not predict future returns. Mining cashflow is paper at Phase
            1, partner-attested from Phase 2.
          </p>
        </footer>
      </div>
    </main>
  );
}
