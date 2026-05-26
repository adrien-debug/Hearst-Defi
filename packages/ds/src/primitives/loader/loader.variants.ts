import { tv } from "@ds/utils/tv";

export const loaderVariants = tv({
  base: "ds-inline-flex ds-items-center ds-justify-center ds-text-[var(--ds-color-accent-500)]",
  variants: {
    size: {
      sm: "ds-h-[var(--ds-spacing-4)] ds-w-[var(--ds-spacing-4)]",
      md: "ds-h-[var(--ds-spacing-5)] ds-w-[var(--ds-spacing-5)]",
      lg: "ds-h-[var(--ds-spacing-7)] ds-w-[var(--ds-spacing-7)]",
      xl: "ds-h-[var(--ds-spacing-10)] ds-w-[var(--ds-spacing-10)]",
    },
  },
  defaultVariants: { size: "md" },
});
