import { cn } from "@/lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[--radius-card] border border-[--color-border] bg-[--color-bg-card] p-6",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-5 flex items-start justify-between gap-4", className)}
      {...props}
    />
  );
}

/**
 * Section title inside a card. Renders as h3 with the .h3 typographic role
 * (was previously mapped to .stat-label which made every section look like
 * a tiny caption).
 */
export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("h3", className)} {...props} />;
}
