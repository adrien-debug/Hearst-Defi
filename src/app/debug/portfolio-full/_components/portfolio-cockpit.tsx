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
    <div className="flex flex-col h-full min-h-[30rem] gap-6">
      <div className="shrink-0">{greeting}</div>
      <div className="shrink-0">{kpis}</div>

      <div className="flex flex-col flex-1 min-h-0 gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 shrink-0">
          <div className="lg:col-span-4 flex flex-col min-h-0 h-full">{donut}</div>
          <div className="lg:col-span-8 flex flex-col min-h-0 h-full">{chart}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-8 flex flex-col min-h-0 h-full">{positions}</div>
          <div className="lg:col-span-4 flex flex-col min-h-0 h-full">{activity}</div>
        </div>
      </div>
    </div>
  );
}
