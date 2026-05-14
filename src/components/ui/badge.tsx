import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[--radius-full] border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider leading-none",
  {
    variants: {
      variant: {
        default:
          "border-[--color-border-strong] bg-[--color-bg-elevated] text-[--color-text-muted]",
        success:
          "border-[--color-success-border] bg-[--color-success-bg] text-[--color-success]",
        warning:
          "border-[--color-warning-border] bg-[--color-warning-bg] text-[--color-warning]",
        danger:
          "border-[--color-danger-border] bg-[--color-danger-bg] text-[--color-danger]",
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
