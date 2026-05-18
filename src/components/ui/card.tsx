import { cn } from "@/lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-panel p-8 relative overflow-hidden group",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[--ct-surface-0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative z-10">{props.children}</div>
    </div>
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-8 flex items-start justify-between gap-4", className)}
      {...props}
    />
  );
}

/**
 * Section title inside a card. Renders as h3 with the .h3 typographic role
 */
export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-2xl font-semibold tracking-tight text-[--ct-text-strong] drop-shadow-sm", className)} {...props} />;
}
