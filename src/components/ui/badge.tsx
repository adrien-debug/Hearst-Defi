import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest leading-none backdrop-blur-md shadow-sm transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-white/10 bg-white/5 text-white/60",
        success:
          "border-green-500/20 bg-green-500/10 text-green-400",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-400",
        danger:
          "border-red-500/20 bg-red-500/10 text-red-400",
        brand:
          "border-white/20 bg-white/10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]",
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
