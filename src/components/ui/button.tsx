import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ct-border-strong] focus-visible:ring-offset-2 focus-visible:ring-offset-[--ct-bg-deep] active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-[--ct-text-strong] text-[--ct-bg-deep] hover:bg-[--ct-text-primary] shadow-[var(--ct-glow-subtle)] hover:shadow-[var(--ct-glow-soft)]",
        secondary:
          "bg-[--ct-surface-0] backdrop-blur-[20px] border border-[--ct-border-soft] text-[--ct-text-primary] hover:bg-[--ct-surface-2] hover:border-[--ct-border-strong] hover:text-[--ct-text-strong] shadow-sm",
        ghost:
          "text-[--ct-text-muted] hover:bg-[--ct-surface-1] hover:text-[--ct-text-strong]",
        danger:
          "border border-[--ct-status-danger-border] bg-[--ct-status-danger-soft] text-[--ct-status-danger] hover:bg-[--ct-status-danger-soft] shadow-[var(--ct-glow-subtle)] hover:shadow-[var(--ct-glow-soft)]",
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
