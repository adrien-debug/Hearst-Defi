import { SkeletonCard } from "@/components/ui/skeleton";

export default function InvestorMemoLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

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
