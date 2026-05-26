import { tv } from "@ds/utils/tv";

export const skeletonVariants = tv({
  base: [
    "ds-block ds-relative ds-overflow-hidden",
    "ds-bg-[var(--ds-border-subtle)]",
    "ds-isolate",
  ].join(" "),
  variants: {
    variant: {
      text:
        "ds-rounded-[var(--ds-radius-sm)] ds-h-[var(--ds-spacing-3)] ds-w-full",
      avatar:
        "ds-rounded-[var(--ds-radius-full)] ds-h-[var(--ds-spacing-10)] ds-w-[var(--ds-spacing-10)]",
      thumbnail:
        "ds-rounded-[var(--ds-radius-md)] ds-h-[var(--ds-spacing-16)] ds-w-[var(--ds-spacing-16)]",
      card:
        "ds-rounded-[var(--ds-radius-card)] ds-h-[var(--ds-spacing-40)] ds-w-full",
      row: "ds-rounded-[var(--ds-radius-sm)] ds-h-[var(--ds-spacing-5)] ds-w-full",
    },
  },
  defaultVariants: { variant: "text" },
});
