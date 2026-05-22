import { SkeletonCard, Skeleton } from "@/components/ui/skeleton";

export default function RoadmapLoading() {
  return (
    <section className="ct-section space-y-16 animate-in fade-in duration-[var(--ct-dur-slower)]">
      {/* Header */}
      <div className="space-y-5">
        <Skeleton className="h-3 w-28" variant="text" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Phases */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-6">
          <Skeleton className="h-7 w-48" />
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ))}
    </section>
  );
}
