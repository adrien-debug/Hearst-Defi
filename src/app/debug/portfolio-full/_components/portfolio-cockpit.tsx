import type { ReactNode } from "react";

interface PortfolioCockpitProps {
  greeting: ReactNode;
  kpis: ReactNode;
  donut: ReactNode;
  chart: ReactNode;
  positions: ReactNode;
  activity: ReactNode;
}

export function PortfolioCockpitDebug({
  greeting,
  kpis,
  donut,
  chart,
  positions,
  activity,
}: PortfolioCockpitProps) {
  return (
    <div className="pf-fixed-debug">
      <div>{greeting}</div>
      <div className="pf-fixed-debug-kpis">{kpis}</div>

      <div className="pf-fixed-debug-body">
        <div className="pf-row-charts-debug">
          {donut}
          {chart}
        </div>

        <div className="pf-row-lower-debug">
          <div className="pf-fixed-positions-debug">{positions}</div>
          {activity}
        </div>
      </div>
    </div>
  );
}
