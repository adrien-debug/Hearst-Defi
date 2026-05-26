/**
 * @ds/core/primitives/switch · variants
 *
 * Token-styled wrapper over `@radix-ui/react-switch`. Three sizes, optional
 * left-positioned label, AAA focus ring.
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const switchRowVariants = tv({
  base: [
    "group/switch inline-flex items-start gap-[var(--ds-spacing-2)]",
    "transition-colors duration-[var(--ds-motion-duration-fast,150ms)]",
  ],
  variants: {
    labelPosition: {
      left: "flex-row-reverse justify-between w-full",
      right: "flex-row",
    },
    disabled: {
      true: "cursor-not-allowed opacity-[var(--ds-opacity-disabled,0.5)]",
      false: "",
    },
  },
  defaultVariants: {
    labelPosition: "right",
    disabled: false,
  },
});

export const switchControlVariants = tv({
  base: [
    "relative shrink-0 inline-flex items-center",
    "rounded-[var(--ds-radius-pill)]",
    "bg-[color:var(--ds-input-border)]",
    "outline-none",
    "transition-[background-color,box-shadow]",
    "duration-[var(--ds-motion-duration-base,200ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
    "focus-visible:outline-[2px] focus-visible:outline-offset-[2px]",
    "focus-visible:outline-[color:var(--ds-color-focus-ring)]",
    "data-[state=checked]:bg-[color:var(--ds-button-primary-bg)]",
    "disabled:cursor-not-allowed",
  ],
  variants: {
    size: {
      sm: "h-[16px] w-[28px] px-[2px]",
      md: "h-[20px] w-[36px] px-[2px]",
      lg: "h-[24px] w-[44px] px-[2px]",
    },
  },
  defaultVariants: { size: "md" },
});

export const switchThumbVariants = tv({
  base: [
    "block rounded-[var(--ds-radius-full)]",
    "bg-[color:var(--ds-surface-base)]",
    "shadow-[0_1px_2px_rgba(0,0,0,0.18)]",
    "transition-transform",
    "duration-[var(--ds-motion-duration-base,200ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
    "motion-reduce:transition-none",
  ],
  variants: {
    size: {
      sm: "h-[12px] w-[12px] data-[state=checked]:translate-x-[12px]",
      md: "h-[16px] w-[16px] data-[state=checked]:translate-x-[16px]",
      lg: "h-[20px] w-[20px] data-[state=checked]:translate-x-[20px]",
    },
  },
  defaultVariants: { size: "md" },
});

export type SwitchRowVariantProps = TVVariantProps<typeof switchRowVariants>;
export type SwitchControlVariantProps = TVVariantProps<
  typeof switchControlVariants
>;
