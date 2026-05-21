import "./portfolio.css";

import { loadPortfolio } from "@/lib/demo/loaders";
import { getInvestor } from "@/lib/auth/session";
import { PortfolioGreeting } from "@/components/portfolio/portfolio-greeting";
import { PortfolioKpiRow } from "@/components/portfolio/kpi-row";
import { AllocationDonut } from "@/components/portfolio/allocation-donut";
import { ValueChart } from "@/components/portfolio/value-chart";
import { PositionsList } from "@/components/portfolio/positions-list";
import { RecentActivity } from "@/components/portfolio/recent-activity";
import { PortfolioCockpit } from "@/components/portfolio/portfolio-cockpit";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portfolio",
  description: "Your positions and distributions",
};

/**
 * Portfolio — the client landing surface after sign-in.
 *
 * Fixed-height (no-scroll) cockpit. On arrival the full grid is shown — at zero
 * if the investor holds no position — with a "Subscribe" button. Subscribing
 * happens IN the cockpit: the center (Section 2) swaps to vault selection + an
 * inline deposit form, which writes a real DB position and returns here filled.
 *
 * Server Component: loads data + renders the cells, then hands them to the
 * client `PortfolioCockpit` which owns the view-mode toggle.
 */
/** Derive a friendly display name from the investor identity. */
function displayName(
  investor: { email: string | null; walletAddress: string | null } | null,
): string {
  if (investor?.email) {
    const local = investor.email.split("@")[0] ?? "";
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  const w = investor?.walletAddress;
  if (w) return `${w.slice(0, 6)}…${w.slice(-4)}`;
  return "Investor";
}

export default async function PortfolioPage() {
  const [data, investor] = await Promise.all([loadPortfolio(), getInvestor()]);

  const name = displayName(investor);

  return (
    <PortfolioCockpit
      greeting={<PortfolioGreeting name={name} data={data} />}
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
