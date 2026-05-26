import { tv, type TVVariantProps } from "../../utils/tv";

export const kpiWidgetVariants = tv({
  slots: {
    root: [
      "flex flex-col gap-[var(--ds-spacing-2)]",
      "rounded-[var(--ds-radius-lg)]",
      "p-[var(--ds-spacing-4)]",
      "min-w-0",
    ],
    header: [
      "flex items-center gap-[var(--ds-spacing-2)]",
      "text-[length:var(--ds-font-size-body-sm)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
    icon: ["shrink-0 inline-flex items-center"],
    label: ["truncate font-[var(--ds-font-weight-body-md,500)]"],
    provenance: [
      "ml-auto shrink-0 inline-flex items-center gap-[var(--ds-spacing-1)]",
      "px-[var(--ds-spacing-1_5)] py-[var(--ds-spacing-0_5)]",
      "rounded-[var(--ds-radius-pill)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "font-[family-name:var(--ds-font-family-mono)]",
      "uppercase tracking-[var(--ds-letter-spacing-wide,0.04em)]",
      "border border-solid",
      "data-[prov=live]:text-[color:var(--ds-status-success-fg,var(--ds-color-success-600))]",
      "data-[prov=live]:border-[color:var(--ds-status-success-fg,var(--ds-color-success-600))]",
      "data-[prov=estimated]:text-[color:var(--ds-status-warning-fg,var(--ds-color-warning-600))]",
      "data-[prov=estimated]:border-[color:var(--ds-status-warning-fg,var(--ds-color-warning-600))]",
      "data-[prov=stale]:text-[color:var(--ds-text-secondary)]",
      "data-[prov=stale]:border-[color:var(--ds-border-default)]",
    ],
    valueRow: [
      "flex items-baseline gap-[var(--ds-spacing-2)] min-w-0",
    ],
    value: [
      "font-[family-name:var(--ds-font-family-display,var(--ds-font-family-sans))]",
      "font-[var(--ds-font-weight-display-md,600)]",
      "text-[color:var(--ds-text-primary)]",
      "tabular-nums",
      "truncate",
    ],
    unit: [
      "text-[color:var(--ds-text-secondary)]",
      "text-[length:var(--ds-font-size-body-sm)]",
      "font-[var(--ds-font-weight-body-md,500)]",
    ],
    deltaRow: ["flex items-center gap-[var(--ds-spacing-2)]"],
    delta: [
      "inline-flex items-center gap-[var(--ds-spacing-1)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "font-[var(--ds-font-weight-body-md,600)]",
      "tabular-nums",
      "data-[dir=up]:text-[color:var(--ds-status-success-fg,var(--ds-color-success-600))]",
      "data-[dir=down]:text-[color:var(--ds-status-danger-fg,var(--ds-color-danger-600))]",
      "data-[dir=flat]:text-[color:var(--ds-text-secondary)]",
    ],
    sparkline: ["w-full shrink-0"],
    caption: [
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
  },
  variants: {
    variant: {
      default: {
        root: ["bg-transparent"],
      },
      bordered: {
        root: [
          "border border-solid border-[color:var(--ds-border-default)]",
          "bg-transparent",
        ],
      },
      filled: {
        root: [
          "bg-[color:var(--ds-bg-elevated,var(--ds-color-neutral-50))]",
          "border border-solid border-[color:var(--ds-border-default)]",
        ],
      },
      accent: {
        root: [
          "bg-[color:color-mix(in_oklch,var(--ds-color-accent-500)_10%,transparent)]",
          "border border-solid border-[color:var(--ds-color-accent-500)]",
        ],
      },
      minimal: {
        root: ["p-[var(--ds-spacing-2)]"],
      },
    },
    size: {
      sm: {
        value: ["text-[length:var(--ds-font-size-heading-md,1.25rem)]"],
        root: ["p-[var(--ds-spacing-3)]"],
      },
      md: {
        value: ["text-[length:var(--ds-font-size-heading-lg,1.75rem)]"],
      },
      lg: {
        value: ["text-[length:var(--ds-font-size-display-sm,2.5rem)]"],
        root: ["p-[var(--ds-spacing-5)]"],
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export type KpiWidgetVariantProps = TVVariantProps<typeof kpiWidgetVariants>;
