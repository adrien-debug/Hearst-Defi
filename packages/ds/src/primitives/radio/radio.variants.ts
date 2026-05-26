/**
 * @ds/core/primitives/radio · variants
 *
 * Token-only RadioGroup + Radio. Layout variants mirror Checkbox
 * (`default` inline / `card` whole-row).
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const radioGroupVariants = tv({
  base: ["flex flex-col gap-[var(--ds-spacing-2)]"],
  variants: {
    orientation: {
      vertical: "flex-col",
      horizontal: "flex-row flex-wrap gap-x-[var(--ds-spacing-4)]",
    },
  },
  defaultVariants: { orientation: "vertical" },
});

export const radioRowVariants = tv({
  base: [
    "group/radio inline-flex items-start gap-[var(--ds-spacing-2)]",
    "transition-colors duration-[var(--ds-motion-duration-fast,150ms)]",
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
  defaultVariants: { variant: "default", disabled: false },
});

export const radioControlVariants = tv({
  base: [
    "shrink-0 inline-flex items-center justify-center",
    "rounded-[var(--ds-radius-full)]",
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
    "data-[state=checked]:border-[color:var(--ds-button-primary-bg)]",
    "disabled:cursor-not-allowed",
  ],
  variants: {
    size: {
      sm: "h-[16px] w-[16px]",
      md: "h-[18px] w-[18px]",
      lg: "h-[22px] w-[22px]",
    },
  },
  defaultVariants: { size: "md" },
});

export const radioIndicatorVariants = tv({
  base: [
    "block rounded-[var(--ds-radius-full)]",
    "bg-[color:var(--ds-button-primary-bg)]",
  ],
  variants: {
    size: {
      sm: "h-[7px] w-[7px]",
      md: "h-[9px] w-[9px]",
      lg: "h-[11px] w-[11px]",
    },
  },
  defaultVariants: { size: "md" },
});

export type RadioGroupVariantProps = TVVariantProps<typeof radioGroupVariants>;
export type RadioRowVariantProps = TVVariantProps<typeof radioRowVariants>;
export type RadioControlVariantProps = TVVariantProps<
  typeof radioControlVariants
>;
