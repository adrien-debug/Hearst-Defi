import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]",
        secondary:
          "glass-panel-subtle text-white/90 hover:bg-white/10 hover:border-white/20 hover:text-white shadow-sm",
        ghost:
          "text-white/60 hover:bg-white/10 hover:text-white",
        danger:
          "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 shadow-[0_0_15px_rgba(248,113,113,0.1)] hover:shadow-[0_0_20px_rgba(248,113,113,0.2)]",
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
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
