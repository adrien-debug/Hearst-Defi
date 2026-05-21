import { cn } from "@/lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "ct-card glass-panel relative overflow-hidden group",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[--ct-surface-0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--ct-dur-slow)] pointer-events-none" />
      <div className="relative z-[var(--ct-z-base)]">{props.children}</div>
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
/**
 * Section title inside a card. Renders as <h3>. Card titles are visually
 * heavier than the body-section `.h3` role (~28px vs 16px), so this primitive
 * binds directly to Tailwind v4 utilities resolved through the `@theme` block
 * in globals.css (text-2xl → --text-2xl, font-semibold → --weight-semibold,
 * tracking-tight → --tracking-tight). No raw hex / no Tailwind default palette.
 */
export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-2xl font-semibold tracking-tight text-[--ct-text-strong] drop-shadow-[var(--ct-glow-subtle)]",
        className,
      )}
      {...props}
    />
  );
}
