import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const EMPHASIZED_BADGE =
  "border-[--ct-border-strong] bg-[--ct-surface-2] text-[--ct-text-strong]";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[--ct-radius-full] border px-2.5 py-1 text-[length:var(--ct-text-micro)] font-medium uppercase tracking-wide leading-none backdrop-blur-md shadow-[var(--ct-shadow-soft)] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[--ct-border] bg-[--ct-surface-1] text-[--ct-text-muted]",
        success:
          "border-[--ct-status-success-border] bg-[--ct-status-success-soft] text-[--ct-status-success]",
        warning:
          "border-[--ct-status-warning-border] bg-[--ct-status-warning-soft] text-[--ct-status-warning]",
        danger:
          "border-[--ct-status-danger-border] bg-[--ct-status-danger-soft] text-[--ct-status-danger]",
        accent: EMPHASIZED_BADGE,
        brand: EMPHASIZED_BADGE,
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
