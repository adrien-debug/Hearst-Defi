/**
 * @ds/core/primitives/combobox · variants
 *
 * The trigger reuses Input styling tokens; the floating list uses popover
 * tokens. Multi-select badges use accent + border tokens.
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const comboTriggerVariants = tv({
  base: [
    "group/combo flex w-full items-center gap-[var(--ds-spacing-2)]",
    "rounded-[var(--ds-radius-input)]",
    "border border-solid",
    "border-[color:var(--ds-input-border)]",
    "bg-[color:var(--ds-input-bg)]",
    "text-[color:var(--ds-input-fg)]",
    "px-[var(--ds-spacing-2_5)]",
    "transition-[border-color,background-color,box-shadow]",
    "duration-[var(--ds-motion-duration-fast,150ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
    "hover:not-data-[disabled=true]:border-[color:var(--ds-input-border-hover)]",
    "data-[focused=true]:border-[color:var(--ds-input-border-focus)]",
    "data-[focused=true]:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-color-focus-ring)_25%,transparent)]",
    "data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-[var(--ds-opacity-disabled,0.6)]",
    "data-[invalid=true]:border-[color:var(--ds-input-border-error)]",
  ],
  variants: {
    size: {
      sm: "min-h-[var(--ds-spacing-8)] text-[length:var(--ds-font-size-body-sm)] py-[var(--ds-spacing-1)]",
      md: "min-h-[var(--ds-spacing-9)] text-[length:var(--ds-font-size-body-md)] py-[var(--ds-spacing-1_5)]",
      lg: "min-h-[var(--ds-spacing-11)] text-[length:var(--ds-font-size-body-md)] py-[var(--ds-spacing-2)]",
    },
  },
  defaultVariants: { size: "md" },
});

export const comboBadgeClasses = [
  "inline-flex items-center gap-[var(--ds-spacing-1)]",
  "rounded-[var(--ds-radius-pill)]",
  "bg-[color:var(--ds-bg-accent-soft)]",
  "text-[color:var(--ds-text-primary)]",
  "px-[var(--ds-spacing-2)] py-[var(--ds-spacing-0_5)]",
  "text-[length:var(--ds-font-size-body-xs)]",
  "border border-solid border-[color:var(--ds-border-default)]",
  "max-w-[180px]",
].join(" ");

export const comboPopoverClasses = [
  "z-[var(--ds-z-popover,60)]",
  "rounded-[var(--ds-radius-popover,12px)]",
  "border border-[color:var(--ds-border-default)]",
  "bg-[color:var(--ds-surface-overlay,var(--ds-surface-raised))]",
  "text-[color:var(--ds-text-primary)]",
  "shadow-[var(--ds-shadow-floating,0_8px_24px_rgba(0,0,0,0.16))]",
  "overflow-hidden",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "motion-reduce:!animate-none",
].join(" ");

export const comboOptionClasses = [
  "relative flex cursor-pointer items-center gap-[var(--ds-spacing-2)]",
  "rounded-[var(--ds-radius-sm)]",
  "px-[var(--ds-spacing-2_5)] py-[var(--ds-spacing-1_5)]",
  "text-[length:var(--ds-font-size-body-sm)]",
  "outline-none",
  "data-[active=true]:bg-[color:var(--ds-button-ghost-bg-hover)]",
  "data-[selected=true]:font-[var(--ds-font-weight-body-md,500)]",
  "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-[var(--ds-opacity-disabled,0.5)]",
].join(" ");

export type ComboTriggerVariantProps = TVVariantProps<
  typeof comboTriggerVariants
>;
