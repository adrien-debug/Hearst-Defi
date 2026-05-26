import { tv } from "@ds/utils/tv";

export const avatarVariants = tv({
  base: [
    "ds-relative ds-inline-flex ds-shrink-0 ds-items-center ds-justify-center",
    "ds-overflow-hidden ds-select-none",
    "ds-bg-[var(--ds-surface-raised)]",
    "ds-text-[var(--ds-text-secondary)]",
    "ds-font-medium ds-leading-none",
    "ds-border ds-border-solid ds-border-[var(--ds-border-default)]",
  ].join(" "),
  variants: {
    variant: {
      default: "ds-rounded-[var(--ds-radius-full)]",
      rounded: "ds-rounded-[var(--ds-radius-lg)]",
      square: "ds-rounded-[var(--ds-radius-none)]",
    },
    size: {
      xs: "ds-h-[var(--ds-spacing-5)] ds-w-[var(--ds-spacing-5)] ds-text-[var(--ds-font-size-micro)]",
      sm: "ds-h-[var(--ds-spacing-6)] ds-w-[var(--ds-spacing-6)] ds-text-[var(--ds-font-size-caption)]",
      md: "ds-h-[var(--ds-spacing-8)] ds-w-[var(--ds-spacing-8)] ds-text-[var(--ds-font-size-body-sm)]",
      lg: "ds-h-[var(--ds-spacing-10)] ds-w-[var(--ds-spacing-10)] ds-text-[var(--ds-font-size-body-md)]",
      xl: "ds-h-[var(--ds-spacing-12)] ds-w-[var(--ds-spacing-12)] ds-text-[var(--ds-font-size-body-lg)]",
      "2xl":
        "ds-h-[var(--ds-spacing-16)] ds-w-[var(--ds-spacing-16)] ds-text-[var(--ds-font-size-heading-sm)]",
    },
  },
  defaultVariants: { variant: "default", size: "md" },
});

export const avatarStatusVariants = tv({
  base: [
    "ds-absolute ds-bottom-0 ds-right-0",
    "ds-rounded-[var(--ds-radius-full)]",
    "ds-border-2 ds-border-solid ds-border-[var(--ds-surface-base)]",
    "ds-z-[1]",
  ].join(" "),
  variants: {
    variant: {
      online: "ds-bg-[var(--ds-status-success-fg)]",
      offline: "ds-bg-[var(--ds-border-strong)]",
      away: "ds-bg-[var(--ds-status-warning-fg)]",
      busy: "ds-bg-[var(--ds-status-danger-fg)]",
    },
    size: {
      xs: "ds-h-[var(--ds-spacing-1_5)] ds-w-[var(--ds-spacing-1_5)]",
      sm: "ds-h-[var(--ds-spacing-2)] ds-w-[var(--ds-spacing-2)]",
      md: "ds-h-[var(--ds-spacing-2_5)] ds-w-[var(--ds-spacing-2_5)]",
      lg: "ds-h-[var(--ds-spacing-3)] ds-w-[var(--ds-spacing-3)]",
      xl: "ds-h-[var(--ds-spacing-3_5)] ds-w-[var(--ds-spacing-3_5)]",
      "2xl": "ds-h-[var(--ds-spacing-4)] ds-w-[var(--ds-spacing-4)]",
    },
  },
  defaultVariants: { size: "md", variant: "offline" },
});
