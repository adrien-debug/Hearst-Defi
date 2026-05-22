import { SkeletonCard, Skeleton } from "@/components/ui/skeleton";

export default function SpecLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-[var(--ct-dur-slower)]">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" variant="text" />
        <Skeleton className="h-12 w-64" />
      </div>

      {/* Spec document body */}
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
