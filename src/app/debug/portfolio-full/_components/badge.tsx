import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[length:var(--ct-text-micro)] mono uppercase tracking-[var(--ct-tracking-wide)] leading-[var(--ct-leading-none)] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[var(--ct-border)] bg-[var(--ct-surface-1)] text-[var(--ct-text-muted)]",
        success:
          "border-[color-mix(in_srgb,var(--ct-accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--ct-accent)_15%,transparent)] text-[var(--ct-accent)]",
        warning:
          "border-[var(--ct-status-warning-border)] bg-[var(--ct-status-warning-soft)] text-[var(--ct-status-warning)]",
        danger:
          "border-[var(--ct-status-danger-border)] bg-[var(--ct-status-danger-soft)] text-[var(--ct-status-danger)]",
        accent:
          "border-[var(--ct-border-strong)] bg-[var(--ct-surface-2)] text-[var(--ct-text-strong)]",
        brand:
          "border-[var(--ct-border-strong)] bg-[var(--ct-surface-2)] text-[var(--ct-text-strong)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
