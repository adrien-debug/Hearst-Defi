import { SkeletonCard } from "@/components/ui/skeleton";

export default function ScenarioLabLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
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
