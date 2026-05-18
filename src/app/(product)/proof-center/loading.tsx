import { SkeletonCard } from "@/components/ui/skeleton";

export default function ProofCenterLoading() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <Skeleton className="h-4 w-96" />
      </div>

      <SkeletonCard />
      <SkeletonCard />
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
