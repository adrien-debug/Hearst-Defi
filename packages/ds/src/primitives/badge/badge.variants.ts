import { tv } from "@ds/utils/tv";

export const badgeVariants = tv({
  base: [
    "ds-inline-flex ds-items-center ds-gap-[var(--ds-spacing-1)]",
    "ds-font-medium ds-leading-none ds-select-none",
    "ds-transition-[background-color,color,border-color]",
    "ds-relative ds-whitespace-nowrap",
    "ds-border ds-border-solid",
  ].join(" "),
  variants: {
    variant: {
      default: [
        "ds-bg-[var(--ds-surface-raised)]",
        "ds-text-[var(--ds-text-primary)]",
        "ds-border-[var(--ds-border-default)]",
      ].join(" "),
      primary: [
        "ds-bg-[var(--ds-button-primary-bg)]",
        "ds-text-[var(--ds-button-primary-fg)]",
        "ds-border-transparent",
      ].join(" "),
      success: [
        "ds-bg-[var(--ds-status-success-bg)]",
        "ds-text-[var(--ds-status-success-fg)]",
        "ds-border-[var(--ds-status-success-border)]",
      ].join(" "),
      warning: [
        "ds-bg-[var(--ds-status-warning-bg)]",
        "ds-text-[var(--ds-status-warning-fg)]",
        "ds-border-[var(--ds-status-warning-border)]",
      ].join(" "),
      danger: [
        "ds-bg-[var(--ds-status-danger-bg)]",
        "ds-text-[var(--ds-status-danger-fg)]",
        "ds-border-[var(--ds-status-danger-border)]",
      ].join(" "),
      info: [
        "ds-bg-[var(--ds-status-info-bg)]",
        "ds-text-[var(--ds-status-info-fg)]",
        "ds-border-[var(--ds-status-info-border)]",
      ].join(" "),
      outline: [
        "ds-bg-transparent",
        "ds-text-[var(--ds-text-primary)]",
        "ds-border-[var(--ds-border-strong)]",
      ].join(" "),
      dot: [
        "ds-bg-transparent",
        "ds-text-[var(--ds-text-secondary)]",
        "ds-border-transparent",
        "ds-pl-[var(--ds-spacing-3)]",
      ].join(" "),
    },
    size: {
      sm: [
        "ds-h-[var(--ds-spacing-5)]",
        "ds-px-[var(--ds-spacing-2)]",
        "ds-text-[var(--ds-font-size-caption)]",
        "ds-rounded-[var(--ds-radius-badge)]",
      ].join(" "),
      md: [
        "ds-h-[var(--ds-spacing-6)]",
        "ds-px-[var(--ds-spacing-2_5)]",
        "ds-text-[var(--ds-font-size-body-xs)]",
        "ds-rounded-[var(--ds-radius-badge)]",
      ].join(" "),
      lg: [
        "ds-h-[var(--ds-spacing-7)]",
        "ds-px-[var(--ds-spacing-3)]",
        "ds-text-[var(--ds-font-size-body-sm)]",
        "ds-rounded-[var(--ds-radius-badge)]",
      ].join(" "),
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});
