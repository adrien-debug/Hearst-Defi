/**
 * @ds/core/primitives/slider · variants
 *
 * Token-styled wrapper over `@radix-ui/react-slider`. Two visual variants:
 *   - `default`  : flat accent fill
 *   - `gradient` : accent → success gradient (gating-style projection slider)
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const sliderRootVariants = tv({
  base: [
    "relative flex w-full touch-none select-none items-center",
    "h-[var(--ds-spacing-6)]",
    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-[var(--ds-opacity-disabled,0.5)]",
  ],
});

export const sliderTrackVariants = tv({
  base: [
    "relative h-[6px] w-full grow",
    "overflow-hidden rounded-[var(--ds-radius-pill)]",
    "bg-[color:var(--ds-input-border)]",
  ],
});

export const sliderRangeVariants = tv({
  base: ["absolute h-full rounded-[var(--ds-radius-pill)]"],
  variants: {
    variant: {
      default: ["bg-[color:var(--ds-button-primary-bg)]"],
      gradient: [
        "bg-[linear-gradient(90deg,var(--ds-button-primary-bg),var(--ds-status-success-fg))]",
      ],
    },
  },
  defaultVariants: { variant: "default" },
});

export const sliderThumbVariants = tv({
  base: [
    "block h-[18px] w-[18px]",
    "rounded-[var(--ds-radius-full)]",
    "bg-[color:var(--ds-surface-base)]",
    "border-[2px] border-solid",
    "border-[color:var(--ds-button-primary-bg)]",
    "shadow-[0_1px_3px_rgba(0,0,0,0.18)]",
    "outline-none",
    "transition-[box-shadow,transform]",
    "duration-[var(--ds-motion-duration-fast,150ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
    "hover:scale-110",
    "focus-visible:outline-[2px] focus-visible:outline-offset-[2px]",
    "focus-visible:outline-[color:var(--ds-color-focus-ring)]",
    "data-[disabled]:cursor-not-allowed",
  ],
});

export type SliderRangeVariantProps = TVVariantProps<
  typeof sliderRangeVariants
>;
