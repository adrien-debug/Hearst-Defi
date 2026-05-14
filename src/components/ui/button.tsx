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
        ghost:
          "text-[--color-text-muted] hover:bg-[--color-bg-elevated] hover:text-[--color-text]",
        danger:
          "border border-[--color-danger-border] bg-[--color-danger-bg] text-[--color-danger] hover:bg-[--color-danger-bg-hover]",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-base",
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
