/**
 * @ds/core/primitives/checkbox · variants
 *
 * Two variants:
 *   - `default` : compact (input only, sits beside its label)
 *   - `card`    : entire row is clickable, wrapped in a bordered box
 *
 * Three sizes drive both the checkbox glyph and the label text scale.
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const checkboxRootVariants = tv({
  base: [
    "group/checkbox",
    "inline-flex items-start gap-[var(--ds-spacing-2)]",
    "transition-colors duration-[var(--ds-motion-duration-fast,150ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
  ],
  variants: {
    variant: {
      default: "",
      card: [
        "w-full rounded-[var(--ds-radius-lg)] border border-solid",
        "border-[color:var(--ds-border-default)]",
        "bg-[color:var(--ds-surface-raised)]",
        "px-[var(--ds-spacing-3)] py-[var(--ds-spacing-3)]",
        "hover:border-[color:var(--ds-border-strong)]",
        "has-[button[data-state=checked]]:border-[color:var(--ds-border-accent)]",
        "has-[button[data-state=checked]]:bg-[color:var(--ds-bg-accent-soft)]",
        "cursor-pointer",
      ],
    },
    disabled: {
      true: "cursor-not-allowed opacity-[var(--ds-opacity-disabled,0.5)]",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    disabled: false,
  },
});

export const checkboxControlVariants = tv({
  base: [
    "peer/checkbox shrink-0",
    "inline-flex items-center justify-center",
    "rounded-[var(--ds-radius-sm)]",
    "border border-solid",
    "border-[color:var(--ds-input-border)]",
    "bg-[color:var(--ds-input-bg)]",
    "outline-none",
    "transition-[background-color,border-color,box-shadow]",
    "duration-[var(--ds-motion-duration-fast,150ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
    "hover:not-disabled:border-[color:var(--ds-border-strong)]",
    "focus-visible:outline-[2px] focus-visible:outline-offset-[2px]",
    "focus-visible:outline-[color:var(--ds-color-focus-ring)]",
    "data-[state=checked]:bg-[color:var(--ds-button-primary-bg)]",
    "data-[state=checked]:border-[color:var(--ds-button-primary-bg)]",
    "data-[state=checked]:text-[color:var(--ds-button-primary-fg)]",
    "data-[state=indeterminate]:bg-[color:var(--ds-button-primary-bg)]",
    "data-[state=indeterminate]:border-[color:var(--ds-button-primary-bg)]",
    "data-[state=indeterminate]:text-[color:var(--ds-button-primary-fg)]",
    "data-[invalid=true]:border-[color:var(--ds-input-border-error)]",
    "disabled:cursor-not-allowed",
  ],
  variants: {
    size: {
      sm: "h-[16px] w-[16px] [&_svg]:h-[10px] [&_svg]:w-[10px]",
      md: "h-[18px] w-[18px] [&_svg]:h-[12px] [&_svg]:w-[12px]",
      lg: "h-[22px] w-[22px] [&_svg]:h-[14px] [&_svg]:w-[14px]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type CheckboxRootVariantProps = TVVariantProps<
  typeof checkboxRootVariants
>;
export type CheckboxControlVariantProps = TVVariantProps<
  typeof checkboxControlVariants
>;
