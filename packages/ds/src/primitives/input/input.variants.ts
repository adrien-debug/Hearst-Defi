/**
 * @ds/core/primitives/input · variants
 *
 * Token-only Input field. Four visual variants (`default`, `filled`, `flushed`,
 * `outline`), three sizes, full state matrix (default → focus → hover →
 * disabled → invalid → valid). Slots for leading / trailing icons and
 * prefix / suffix add-ons.
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const inputRootVariants = tv({
  base: [
    "group/input relative inline-flex w-full items-center",
    "transition-[border-color,background-color,box-shadow]",
    "duration-[var(--ds-motion-duration-fast,150ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
    "rounded-[var(--ds-radius-input)]",
    "border border-solid",
    "text-[color:var(--ds-input-fg)]",
  ],
  variants: {
    variant: {
      default: [
        "bg-[color:var(--ds-input-bg)]",
        "border-[color:var(--ds-input-border)]",
        "hover:not-has-[input:disabled]:border-[color:var(--ds-input-border-hover)]",
        "focus-within:border-[color:var(--ds-input-border-focus)]",
        "focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-color-focus-ring)_25%,transparent)]",
      ],
      filled: [
        "bg-[color:var(--ds-bg-muted)]",
        "border-transparent",
        "hover:not-has-[input:disabled]:bg-[color:var(--ds-input-bg-hover)]",
        "focus-within:bg-[color:var(--ds-input-bg)]",
        "focus-within:border-[color:var(--ds-input-border-focus)]",
        "focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-color-focus-ring)_25%,transparent)]",
      ],
      flushed: [
        "bg-transparent rounded-none border-0",
        "border-b-[1px] border-b-[color:var(--ds-input-border)]",
        "focus-within:border-b-[color:var(--ds-input-border-focus)]",
      ],
      outline: [
        "bg-transparent",
        "border-[color:var(--ds-border-default)]",
        "hover:not-has-[input:disabled]:border-[color:var(--ds-border-strong)]",
        "focus-within:border-[color:var(--ds-input-border-focus)]",
        "focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-color-focus-ring)_25%,transparent)]",
      ],
    },
    size: {
      sm: "h-[var(--ds-spacing-8)] px-[var(--ds-spacing-2_5)] text-[length:var(--ds-font-size-body-sm)]",
      md: "h-[var(--ds-spacing-9)] px-[var(--ds-spacing-3)] text-[length:var(--ds-font-size-body-md)]",
      lg: "h-[var(--ds-spacing-11)] px-[var(--ds-spacing-4)] text-[length:var(--ds-font-size-body-md)]",
    },
    invalid: {
      true: [
        "border-[color:var(--ds-input-border-error)]",
        "focus-within:border-[color:var(--ds-input-border-error)]",
        "focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-status-danger-fg)_25%,transparent)]",
      ],
      false: "",
    },
    valid: {
      true: [
        "border-[color:var(--ds-status-success-fg)]",
        "focus-within:border-[color:var(--ds-status-success-fg)]",
        "focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ds-status-success-fg)_20%,transparent)]",
      ],
      false: "",
    },
    disabled: {
      true: [
        "bg-[color:var(--ds-input-bg-disabled)]",
        "cursor-not-allowed opacity-[var(--ds-opacity-disabled,0.6)]",
      ],
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    invalid: false,
    valid: false,
    disabled: false,
  },
});

export const inputElementVariants = tv({
  base: [
    "flex-1 bg-transparent outline-none border-0 appearance-none",
    "text-inherit placeholder:text-[color:var(--ds-input-placeholder)]",
    "disabled:cursor-not-allowed",
    "w-full h-full",
  ],
});

export type InputRootVariantProps = TVVariantProps<typeof inputRootVariants>;
