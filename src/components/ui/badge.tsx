import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--ct-radius-full)] border px-2.5 py-1 text-[length:var(--ct-text-micro)] font-medium uppercase tracking-[var(--ct-tracking-wide)] leading-[var(--ct-leading-none)] backdrop-blur-md ct-shadow-soft transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[var(--ct-border)] bg-[var(--ct-surface-1)] text-[var(--ct-text-muted)]",
        success:
          "border-[var(--ct-status-success-border)] bg-[var(--ct-status-success-soft)] text-[var(--ct-status-success)]",
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
