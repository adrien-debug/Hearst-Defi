import { AllocationDonut } from "./_components/allocation-donut";
import { PortfolioCockpitDebug } from "./_components/portfolio-cockpit";
import { PortfolioGreeting } from "./_components/portfolio-greeting";
import { PortfolioKpiRow } from "./_components/kpi-row";
import { PositionsList } from "./_components/positions-list";
import { RecentActivity } from "./_components/recent-activity";
import { ValueChart } from "./_components/value-chart";
import { MOCK_PORTFOLIO } from "./_data/mock-data";

export const dynamic = "force-static";

export const metadata = {
  title: "Debug · Portfolio (full clone)",
  description: "Isolated portfolio clone — design playground, no prod impact.",
  robots: "noindex, nofollow",
};

/**
 * Clone complet de /portfolio pour itérer le design SANS toucher la prod.
 *
 * Toutes les briques (composants, CSS, types UI primitives, mock data) sont
 * forkées sous `src/app/debug/portfolio-full/_*`. Modifier ces fichiers ne
 * touche QUE cette URL.
 *
 * Imports prod conservés volontairement :
 *  - `@/lib/data/portfolio` (types only)
 *  - `@/lib/format/usd-compact` (helper pur)
 *  - `@/lib/cn` (utility)
 *
 * Pour supprimer le clone : `rm -rf src/app/debug/portfolio-full`.
 */
export default function PortfolioFullDebugPage() {
  const data = MOCK_PORTFOLIO;

  return (
    <PortfolioCockpitDebug
      greeting={<PortfolioGreeting name="Adrien" data={data} />}
      kpis={<PortfolioKpiRow data={data} />}
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
