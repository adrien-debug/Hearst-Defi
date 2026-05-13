import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[--radius-button] text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brand] focus-visible:ring-offset-2 focus-visible:ring-offset-[--color-bg]",
  {
    variants: {
      variant: {
        primary:
          "bg-[--color-brand] text-[--color-brand-fg] hover:bg-[--color-brand-strong]",
        secondary:
          "border border-[--color-border-strong] bg-[--color-bg-elevated] text-[--color-text] hover:bg-[--color-bg-card]",
        ghost: "text-[--color-text-muted] hover:text-[--color-text]",
        danger:
          "border border-[oklch(0.40_0.14_25)] bg-[oklch(0.24_0.10_25)] text-[--color-danger] hover:bg-[oklch(0.28_0.12_25)]",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-10 px-5",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
