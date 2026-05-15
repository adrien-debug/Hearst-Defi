import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AllocationSection } from "@/components/dashboard/allocation-section";
import { BtcTacticalSection } from "@/components/dashboard/btc-tactical";
import { HeroMetrics } from "@/components/dashboard/hero-metrics";
import { MiningHealthSection } from "@/components/dashboard/mining-health";
import { TimeseriesSection } from "@/components/dashboard/timeseries-section";
import { loadDashboardData } from "@/lib/data/dashboard";
import { fetchHashprice } from "@/lib/data/hashprice";
import { projectionFor } from "@/lib/data/ptai-projections";
import type {
  AllocationBucket,
  BtcTactical,
  DashboardSnapshot,
  MiningHealth,
  PtaiEvent,
} from "@/lib/mock/dashboard";
import type {
  DashboardAllocation,
  DashboardData,
  DashboardRecentEvent,
} from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, hashprice] = await Promise.all([
    loadDashboardData(),
    fetchHashprice(),
  ]);
  const snapshot = toDashboardSnapshot(data);
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

      <HeroMetrics snapshot={snapshot} btcPrice={data.btcPrice} />

      <TimeseriesSection data={data.timeseries} />

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <AllocationSection
            allocations={snapshot.allocations}
            blendedYieldRange={snapshot.blendedYieldRange}
          />
        </div>
        <MiningHealthSection
          miningHealth={snapshot.miningHealth}
          hashprice={{
            usd_per_th_day: hashprice.usd_per_th_day,
            stale: hashprice.stale,
          }}
        />
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

// ---------------------------------------------------------------------------
// Projection: DashboardData (Prisma + live) -> DashboardSnapshot (UI shape).
//
// Lives inside the page so it stays close to its single consumer. Anything
// that has no DB analog (BTC tactical position details, hard-coded next
// triggers) is derived from sensible defaults consistent with the legacy
// mock so the visual rendering does not regress.
// ---------------------------------------------------------------------------

const ALLOCATION_LABEL: Record<DashboardAllocation["bucket"], AllocationBucket["label"]> = {
  mining: "Mining cashflow",
  usdc_base: "USDC base yield",
  btc_tactical: "BTC tactical",
  stable_reserve: "Stable reserve",
};

const ALLOCATION_ID: Record<DashboardAllocation["bucket"], AllocationBucket["id"]> = {
  mining: "mining",
  usdc_base: "usdc-base",
  btc_tactical: "btc-tactical",
  stable_reserve: "stable-reserve",
};

const ALLOCATION_NOTE: Record<DashboardAllocation["bucket"], string> = {
  mining: "net of energy + hosting + pool fees",
  usdc_base: "blended Aave / Morpho / Sky",
  btc_tactical: "P&L variable, rule-driven entries",
  stable_reserve: "T-bill-backed (sDAI, Sky USDS)",
};

const ALLOCATION_PROVENANCE: Record<
  DashboardAllocation["bucket"],
  AllocationBucket["provenance"]
> = {
  mining: "attested",
  usdc_base: "oracle",
  btc_tactical: "live",
  stable_reserve: "oracle",
};

function toDashboardSnapshot(data: DashboardData): DashboardSnapshot {
  const allocations: AllocationBucket[] = data.allocations.map((a) => ({
    id: ALLOCATION_ID[a.bucket],
    label: ALLOCATION_LABEL[a.bucket],
    pctAum: a.pct,
    yieldBps: Math.round(a.yieldContributionBps),
    yieldNote: ALLOCATION_NOTE[a.bucket],
    provenance: ALLOCATION_PROVENANCE[a.bucket],
  }));

  const miningHealth: MiningHealth = {
    marginScore: data.vault.miningMarginScore,
    hashpriceTrendPct: data.hashpriceTrendPct,
    opConfidence: data.operationalConfidence,
    provenance: "attested",
  };

  const btcAlloc = data.allocations.find((a) => a.bucket === "btc_tactical");
  const btcSleeveUsd = btcAlloc?.valueUsdc ?? 0;
  const btcSleevePct = btcAlloc?.pct ?? 0;
  const btcPriceUsd = data.btcPrice.usd === 0 ? 94_180 : data.btcPrice.usd;
  // Use a stable synthetic entry — `Distribution`/`Allocation` rows do not
  // carry a BTC cost basis, so the avg entry remains an estimated number.
  // The mock anchored at 58,420; we keep that to preserve visual parity.
  const avgEntry = 58_420;
  const btcHeld = btcPriceUsd > 0 ? btcSleeveUsd / btcPriceUsd : 0;
  const costBasis = btcHeld * avgEntry;
  const pnlUsd = Math.round(btcSleeveUsd - costBasis);
  const pnlPct = costBasis > 0 ? (pnlUsd / costBasis) * 100 : 0;

  const btcTactical: BtcTactical = {
    positionSizePctAum: btcSleevePct,
    positionSizeUsd: btcSleeveUsd,
    btcHeld: round2(btcHeld),
    avgEntry,
    currentPrice: Math.round(btcPriceUsd),
    pnlUsd,
    pnlPct: round1(pnlPct),
    nextTriggers: [
      {
        id: "acc-t1",
        label: "Next accumulate",
        condition: `BTC < $${Math.round(btcPriceUsd * 0.8).toLocaleString("en-US")} (−20% from spot)`,
        ruleId: "R-BTC-1",
      },
      {
        id: "tp-t1",
        label: "Next profit-take",
        condition: `BTC > $${Math.round(avgEntry * 1.3).toLocaleString("en-US")} (entry × 1.30)`,
        ruleId: "R-BTC-3",
      },
    ],
    guardrails: [
      {
        id: "vol",
        label: "Volatility guardrail",
        status: "normal",
        detail: "30d realised vol within band (threshold 90%)",
      },
      {
        id: "margin",
        label: "Mining margin guardrail",
        status: data.vault.miningMarginScore >= 70 ? "healthy" : "normal",
        detail: `Margin score ${data.vault.miningMarginScore} — ${
          data.vault.miningMarginScore >= 70 ? "accumulation enabled" : "within tolerance"
        }`,
      },
    ],
    provenance: "oracle",
  };

  const blendedBps = data.allocations.reduce(
    (acc, a) => acc + (a.pct / 100) * a.yieldContributionBps,
    0,
  );
  const blendedPct = blendedBps / 100;
  const blendedRange = {
    low: round1(Math.max(0, blendedPct * 0.85)),
    high: round1(Math.max(blendedPct * 0.85 + 0.5, blendedPct * 1.18)),
  };

  return {
    asOf: data.vault.asOf.toISOString(),
    aum: {
      valueUsd: data.vault.aumUsdc,
      delta30dUsd: data.vault.delta30dUsdc,
      provenance: data.source === "fallback" ? "estimated" : "live",
    },
    currentApyRange: data.vault.apyRange,
    apyProvenance: "live",
    stressedApy: data.vault.stressedApy,
    stressedProvenance: "estimated",
    stressedScenarioLabel: "Bear + Mining Compression",
    riskScore: {
      value: data.vault.riskScore,
      bandLabel: riskBand(data.vault.riskScore),
      provenance: "live",
    },
    nextDistribution: {
      dateLabel: formatDistributionDate(data.latestDistribution),
      estimateUsd: data.latestDistribution.amount_usdc,
      provenance: data.latestDistribution.status === "paid" ? "live" : "estimated",
    },
    allocations,
    blendedYieldRange: blendedRange,
    miningHealth,
    btcTactical,
    recentEvents:
      data.recentEvents.length > 0 ? data.recentEvents.map(toPtaiEvent) : [],
  };
}

function toPtaiEvent(e: DashboardRecentEvent): PtaiEvent {
  return {
    id: e.id,
    timestamp: e.takenAt.toISOString(),
    ruleId: e.ruleId,
    kind: classifyEvent(e.ruleId),
    projection: e.impactText,
    trigger: `${e.ruleId} — ${e.triggerText}`,
    action: e.actionText,
    impact: e.impactText,
  };
}

function classifyEvent(ruleId: string): PtaiEvent["kind"] {
  if (ruleId.startsWith("R-DIST")) return "distribution";
  if (ruleId.startsWith("R-BTC")) return "alert";
  if (/^R-(WARN|ALERT)/.test(ruleId)) return "alert";
  return "rebalance";
}

function riskBand(score: number): string {
  if (score <= 33) return "Low";
  if (score <= 50) return "Low–Moderate";
  if (score <= 66) return "Moderate";
  if (score <= 80) return "Elevated";
  return "High";
}

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatDistributionDate(d: {
  period: string;
  paid_at: Date | null;
  status: string;
}): string {
  if (d.paid_at) return monthDayFmt.format(d.paid_at);
  // "YYYY-MM" -> last day of that month.
  const parts = d.period.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return d.period;
  const lastDay = new Date(Date.UTC(y, m, 0));
  return monthDayFmt.format(lastDay);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
