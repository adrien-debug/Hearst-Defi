import { AllocationDonut } from "./_components/allocation-donut";
import { PortfolioCockpitDebug } from "./_components/portfolio-cockpit";
import { PortfolioGreeting } from "./_components/portfolio-greeting";
import { PortfolioKpiRow } from "./_components/kpi-row";
import { PositionsList } from "./_components/positions-list";
import { RecentActivity } from "./_components/recent-activity";
import { ValueChart } from "./_components/value-chart";
import { LockMeter } from "@/components/portfolio/lock-meter";
import { TimeToCash } from "@/components/portfolio/time-to-cash";
import { MOCK_PORTFOLIO } from "./_data/mock-data";

export const dynamic = "force-static";

export const metadata = {
  title: "Debug · Portfolio (full clone)",
  description: "Isolated portfolio clone — design playground, no prod impact.",
  robots: "noindex, nofollow",
};

/**
 * Clone complet de /portfolio pour itérer le design SANS toucher la prod.
 */
export default function PortfolioFullDebugPage() {
  const data = MOCK_PORTFOLIO;

  // Mock props for widgets
  const lockMeterProps = {
    lockStart: new Date(Date.now() - 45 * 86400000),
    softLockupDays: 60,
    earlyExitPenaltyBps: 150,
  };

  const timeToCashProps = {
    cycleStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
    cycleDays: 30,
    projectedUsdc: 1240,
    aprLow: 9.4,
    aprHigh: 12.8,
  };

  return (
    <PortfolioCockpitDebug
      greeting={<PortfolioGreeting name="Adrien" data={data} />}
      quickActions={
        <div className="flex flex-wrap items-center gap-3 rounded-(--ct-radius-lg) border border-(--ct-border-soft) bg-(--ct-surface-1) px-5 py-3 opacity-50">
          <span className="body-xs font-semibold uppercase tracking-(--ct-tracking-wide) text-(--ct-text-muted) mr-auto">
            Tools (Debug Placeholder)
          </span>
          <div className="h-8 w-32 bg-(--ct-surface-2) rounded-(--ct-radius-md)" />
          <div className="h-8 w-32 bg-(--ct-surface-2) rounded-(--ct-radius-md)" />
        </div>
      }
      kpis={<PortfolioKpiRow data={data} />}
      lockMeter={<LockMeter {...lockMeterProps} />}
      timeToCash={<TimeToCash {...timeToCashProps} />}
      donut={
        <AllocationDonut
          positions={data.positions}
          totalValueUsdc={data.totalValueUsdc}
          source={data.source}
        />
      }
      chart={
        <ValueChart
          positions={data.positions}
          totalValueUsdc={data.totalValueUsdc}
          source={data.source}
        />
      }
      positions={
        <PositionsList positions={data.positions} source={data.source} />
      }
      activity={
        <RecentActivity
          transactions={data.recentTransactions}
          source={data.source}
        />
      }
    />
  );
}
