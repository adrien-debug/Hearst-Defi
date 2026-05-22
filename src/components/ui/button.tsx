import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--ct-radius-full)] text-sm font-medium transition-all duration-[var(--ct-dur-base)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)] active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "font-bold bg-[var(--ct-accent)] text-[var(--ct-bg-deep)] hover:bg-[var(--ct-accent-strong)] shadow-[var(--ct-glow-subtle)] hover:shadow-[var(--ct-glow-soft)]",
        secondary:
          "bg-[var(--ct-surface-0)] backdrop-blur-xl border border-[var(--ct-border-soft)] text-[var(--ct-text-primary)] hover:bg-[var(--ct-surface-2)] hover:border-[var(--ct-border-strong)] hover:text-[var(--ct-text-strong)] shadow-[var(--ct-shadow-soft)]",
        ghost:
          "text-[var(--ct-text-muted)] hover:bg-[var(--ct-surface-1)] hover:text-[var(--ct-text-strong)]",
        danger:
          "border border-[var(--ct-status-danger-border)] bg-[var(--ct-status-danger-soft)] text-[var(--ct-status-danger)] hover:bg-[var(--ct-status-danger-soft)] shadow-[var(--ct-glow-subtle)] hover:shadow-[var(--ct-glow-soft)]",
      },
      size: {
        sm: "h-8 px-4 text-xs",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  disabled,
  "aria-disabled": ariaDisabledProp,
  ...rest
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  // Propagate aria-disabled so AT (NVDA/JAWS/VoiceOver) reliably announce the
  // disabled state. An explicit aria-disabled from the caller takes precedence.
  const ariaDisabled = ariaDisabledProp ?? (disabled ? true : undefined);
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled}
      aria-disabled={ariaDisabled}
      {...rest}
    />
  );
}
