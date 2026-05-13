import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
  {
    variants: {
      variant: {
        default:
          "border-[--color-border-strong] bg-[--color-bg-elevated] text-[--color-text-muted]",
        success:
          "border-[oklch(0.38_0.10_145)] bg-[oklch(0.22_0.06_145)] text-[--color-success]",
        warning:
          "border-[oklch(0.40_0.10_70)] bg-[oklch(0.24_0.06_70)] text-[--color-warning]",
        danger:
          "border-[oklch(0.40_0.14_25)] bg-[oklch(0.24_0.10_25)] text-[--color-danger]",
        brand:
          "border-[var(--color-accent-subtle)] bg-[var(--color-accent-dim)] text-[--color-brand]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
