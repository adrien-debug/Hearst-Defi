/**
 * @ds/core/primitives/textarea · variants
 *
 * Visual styling parallels Input, but lays out vertically. Three variants
 * (`default`, `filled`, `flushed`) and three sizes. Compatible with
 * `autoResize` which adjusts `rows` dynamically.
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const textareaVariants = tv({
  base: [
    "block w-full appearance-none",
    "rounded-[var(--ds-radius-input)]",
    "border border-solid",
    "px-[var(--ds-spacing-3)] py-[var(--ds-spacing-2_5)]",
    "text-[color:var(--ds-input-fg)]",
    "placeholder:text-[color:var(--ds-input-placeholder)]",
    "outline-none",
    "transition-[border-color,background-color,box-shadow]",
    "duration-[var(--ds-motion-duration-fast,150ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
    "disabled:cursor-not-allowed disabled:opacity-[var(--ds-opacity-disabled,0.6)]",
    "resize-y",
  ],
  variants: {
    variant: {
      default: [
        "bg-[color:var(--ds-input-bg)]",
        "border-[color:var(--ds-input-border)]",
        "hover:not-disabled:border-[color:var(--ds-input-border-hover)]",
        "focus:border-[color:var(--ds-input-border-focus)]",
        "focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-color-focus-ring)_25%,transparent)]",
      ],
      filled: [
        "bg-[color:var(--ds-bg-muted)]",
        "border-transparent",
        "hover:not-disabled:bg-[color:var(--ds-input-bg-hover)]",
        "focus:bg-[color:var(--ds-input-bg)]",
        "focus:border-[color:var(--ds-input-border-focus)]",
        "focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-color-focus-ring)_25%,transparent)]",
      ],
      flushed: [
        "rounded-none border-0 bg-transparent px-0",
        "border-b-[1px] border-b-[color:var(--ds-input-border)]",
        "focus:border-b-[color:var(--ds-input-border-focus)]",
      ],
    },
    size: {
      sm: "text-[length:var(--ds-font-size-body-sm)] min-h-[calc(var(--ds-spacing-8)*2)]",
      md: "text-[length:var(--ds-font-size-body-md)] min-h-[calc(var(--ds-spacing-9)*2)]",
      lg: "text-[length:var(--ds-font-size-body-md)] min-h-[calc(var(--ds-spacing-11)*2)]",
    },
    invalid: {
      true: [
        "border-[color:var(--ds-input-border-error)]",
        "focus:border-[color:var(--ds-input-border-error)]",
        "focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-status-danger-fg)_25%,transparent)]",
      ],
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    invalid: false,
  },
});

export type TextareaVariantProps = TVVariantProps<typeof textareaVariants>;
