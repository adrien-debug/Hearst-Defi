/**
 * @ds/core/primitives/icon-button · variants
 *
 * Square button optimized for a single Lucide icon. Always carries an
 * `aria-label` (enforced at the type level). Three visual flavors:
 * `ghost`, `solid`, `outline`. Five touch-target-correct sizes.
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const iconButtonVariants = tv({
  base: [
    "inline-flex items-center justify-center",
    "rounded-[var(--ds-radius-button)]",
    "border border-solid border-transparent",
    "transition-[background-color,color,border-color,box-shadow,transform,opacity]",
    "duration-[var(--ds-motion-duration-fast,150ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
    "active:translate-y-[1px]",
    "outline-none",
    "focus-visible:outline-[2px] focus-visible:outline-offset-[2px]",
    "focus-visible:outline-[color:var(--ds-color-focus-ring)]",
    "disabled:cursor-not-allowed disabled:opacity-[var(--ds-opacity-disabled,0.5)]",
    "disabled:active:translate-y-0",
  ],
  variants: {
    variant: {
      ghost: [
        "bg-[color:var(--ds-button-ghost-bg)]",
        "text-[color:var(--ds-button-ghost-fg)]",
        "hover:not-disabled:bg-[color:var(--ds-button-ghost-bg-hover)]",
        "active:not-disabled:bg-[color:var(--ds-button-ghost-bg-active)]",
      ],
      solid: [
        "bg-[color:var(--ds-button-secondary-bg)]",
        "text-[color:var(--ds-button-secondary-fg)]",
        "border-[color:var(--ds-button-secondary-border)]",
        "hover:not-disabled:bg-[color:var(--ds-button-secondary-bg-hover)]",
        "active:not-disabled:bg-[color:var(--ds-button-secondary-bg-active)]",
      ],
      outline: [
        "bg-transparent",
        "text-[color:var(--ds-text-primary)]",
        "border-[color:var(--ds-border-default)]",
        "hover:not-disabled:border-[color:var(--ds-border-strong)]",
        "hover:not-disabled:bg-[color:var(--ds-button-ghost-bg-hover)]",
        "active:not-disabled:bg-[color:var(--ds-button-ghost-bg-active)]",
      ],
    },
    size: {
      xs: "h-[var(--ds-spacing-6)] w-[var(--ds-spacing-6)] [&_svg]:h-[12px] [&_svg]:w-[12px]",
      sm: "h-[var(--ds-spacing-7)] w-[var(--ds-spacing-7)] [&_svg]:h-[14px] [&_svg]:w-[14px]",
      md: "h-[var(--ds-spacing-9)] w-[var(--ds-spacing-9)] [&_svg]:h-[16px] [&_svg]:w-[16px]",
      lg: "h-[var(--ds-spacing-10)] w-[var(--ds-spacing-10)] [&_svg]:h-[18px] [&_svg]:w-[18px]",
      xl: "h-[var(--ds-spacing-12)] w-[var(--ds-spacing-12)] [&_svg]:h-[22px] [&_svg]:w-[22px]",
    },
    loading: {
      true: "cursor-progress",
      false: "",
    },
  },
  defaultVariants: {
    variant: "ghost",
    size: "md",
    loading: false,
  },
});

export type IconButtonVariantProps = TVVariantProps<typeof iconButtonVariants>;
