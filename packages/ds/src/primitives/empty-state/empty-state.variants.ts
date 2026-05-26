import { tv } from "@ds/utils/tv";

export const emptyStateVariants = tv({
  base: [
    "ds-flex ds-flex-col ds-items-center ds-text-center",
    "ds-text-[var(--ds-text-primary)]",
    "ds-gap-[var(--ds-spacing-3)]",
  ].join(" "),
  variants: {
    variant: {
      default: [
        "ds-p-[var(--ds-spacing-8)]",
        "ds-rounded-[var(--ds-radius-card)]",
        "ds-bg-[var(--ds-surface-raised)]",
      ].join(" "),
      bordered: [
        "ds-p-[var(--ds-spacing-8)]",
        "ds-rounded-[var(--ds-radius-card)]",
        "ds-border ds-border-dashed ds-border-[var(--ds-border-default)]",
      ].join(" "),
      centered: [
        "ds-py-[var(--ds-spacing-16)] ds-px-[var(--ds-spacing-8)]",
      ].join(" "),
      minimal: [
        "ds-py-[var(--ds-spacing-6)] ds-px-[var(--ds-spacing-4)]",
        "ds-text-[var(--ds-text-secondary)]",
      ].join(" "),
    },
  },
  defaultVariants: { variant: "default" },
});
