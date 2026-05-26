/**
 * @ds/core/primitives/select · variants
 *
 * Radix Select trigger styled like a token-only Input. Three sizes mirror
 * Input's. Content / item slots styled for keyboard navigation correctness.
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const selectTriggerVariants = tv({
  base: [
    "inline-flex w-full items-center justify-between gap-[var(--ds-spacing-2)]",
    "rounded-[var(--ds-radius-input)] border border-solid",
    "bg-[color:var(--ds-input-bg)]",
    "border-[color:var(--ds-input-border)]",
    "text-[color:var(--ds-input-fg)]",
    "px-[var(--ds-spacing-3)]",
    "text-left",
    "outline-none",
    "transition-[border-color,background-color,box-shadow]",
    "duration-[var(--ds-motion-duration-fast,150ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
    "hover:not-disabled:border-[color:var(--ds-input-border-hover)]",
    "data-[state=open]:border-[color:var(--ds-input-border-focus)]",
    "data-[state=open]:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-color-focus-ring)_25%,transparent)]",
    "focus-visible:border-[color:var(--ds-input-border-focus)]",
    "focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-color-focus-ring)_25%,transparent)]",
    "disabled:cursor-not-allowed disabled:opacity-[var(--ds-opacity-disabled,0.6)]",
    "data-[placeholder]:text-[color:var(--ds-input-placeholder)]",
  ],
  variants: {
    size: {
      sm: "h-[var(--ds-spacing-8)] text-[length:var(--ds-font-size-body-sm)]",
      md: "h-[var(--ds-spacing-9)] text-[length:var(--ds-font-size-body-md)]",
      lg: "h-[var(--ds-spacing-11)] text-[length:var(--ds-font-size-body-md)]",
    },
    invalid: {
      true: [
        "border-[color:var(--ds-input-border-error)]",
        "focus-visible:border-[color:var(--ds-input-border-error)]",
      ],
      false: "",
    },
  },
  defaultVariants: {
    size: "md",
    invalid: false,
  },
});

export const selectContentClasses = [
  "z-[var(--ds-z-popover,60)]",
  "min-w-[var(--radix-select-trigger-width)]",
  "max-h-[var(--radix-select-content-available-height)]",
  "overflow-y-auto",
  "rounded-[var(--ds-radius-popover,12px)]",
  "border border-[color:var(--ds-border-default)]",
  "bg-[color:var(--ds-surface-overlay,var(--ds-surface-raised))]",
  "text-[color:var(--ds-text-primary)]",
  "shadow-[var(--ds-shadow-floating,0_8px_24px_rgba(0,0,0,0.16))]",
  "py-[var(--ds-spacing-1)]",
  "outline-none",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "motion-reduce:!animate-none",
].join(" ");

export const selectItemClasses = [
  "relative flex w-full cursor-default select-none items-center",
  "gap-[var(--ds-spacing-2)]",
  "rounded-[var(--ds-radius-sm)]",
  "px-[var(--ds-spacing-2_5)] py-[var(--ds-spacing-1_5)]",
  "mx-[var(--ds-spacing-1)]",
  "text-[length:var(--ds-font-size-body-sm)]",
  "outline-none",
  "data-[highlighted]:bg-[color:var(--ds-button-ghost-bg-hover)]",
  "data-[highlighted]:text-[color:var(--ds-text-primary)]",
  "data-[state=checked]:font-[var(--ds-font-weight-body-md,500)]",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-[var(--ds-opacity-disabled,0.5)]",
].join(" ");

export const selectLabelClasses = [
  "px-[var(--ds-spacing-3)] py-[var(--ds-spacing-1_5)]",
  "text-[length:var(--ds-font-size-body-xs)]",
  "uppercase tracking-wide",
  "text-[color:var(--ds-text-muted)]",
].join(" ");

export const selectSeparatorClasses = [
  "my-[var(--ds-spacing-1)] h-px",
  "bg-[color:var(--ds-border-default)]",
].join(" ");

export type SelectTriggerVariantProps = TVVariantProps<
  typeof selectTriggerVariants
>;
