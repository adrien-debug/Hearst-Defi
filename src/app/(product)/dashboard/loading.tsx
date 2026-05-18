import { SkeletonCard, SkeletonMetric } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between px-2">
        <div className="space-y-2">
          <SkeletonMetric />
          <Skeleton className="h-16 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>

      {/* Hero Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Timeseries */}
      <SkeletonCard />

      {/* Allocation + Mining Health */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>

      {/* BTC Tactical + Risk */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>

      {/* Activity Feed */}
      <SkeletonCard />
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-white/[0.06] rounded-md ${className}`}
      aria-hidden="true"
    />
  );
}
