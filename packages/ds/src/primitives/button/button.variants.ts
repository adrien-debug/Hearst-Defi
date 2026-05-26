/**
 * @ds/core/primitives/button · variants
 *
 * Token-only styling: every color/spacing/radius/motion property reads a
 * `--ds-*` custom property declared by the theme layer. No hex, no px literal.
 *
 * Variant matrix:
 *   variant   : primary | secondary | tertiary | ghost | outline | danger | success | link
 *   size      : xs | sm | md | lg | xl
 *   fullWidth : boolean
 *   loading   : boolean
 *
 * Compound rules:
 *   - `loading=true` forces `aria-busy=true` semantics + dims label, keeps width.
 *   - `link` variant collapses padding and underlines text.
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const buttonVariants = tv({
  base: [
    // Layout
    "inline-flex items-center justify-center gap-[var(--ds-spacing-2)]",
    "relative isolate select-none whitespace-nowrap align-middle",
    // Sizing baseline
    "rounded-[var(--ds-radius-button)]",
    "font-[family-name:var(--ds-font-family-sans)]",
    "leading-[var(--ds-font-line-height-tight,1.2)]",
    // Border ring (kept transparent unless variant turns it on)
    "border border-solid border-transparent",
    // Motion (respects prefers-reduced-motion via tokens.css)
    "transition-[background-color,color,border-color,box-shadow,transform,opacity]",
    "duration-[var(--ds-motion-duration-fast,150ms)]",
    "ease-[var(--ds-motion-ease-out,cubic-bezier(0.16,1,0.3,1))]",
    "active:translate-y-[1px]",
    // Focus ring (AAA, token-driven)
    "outline-none",
    "focus-visible:outline-[2px] focus-visible:outline-offset-[2px]",
    "focus-visible:outline-[color:var(--ds-color-focus-ring)]",
    // Disabled
    "disabled:cursor-not-allowed disabled:opacity-[var(--ds-opacity-disabled,0.5)]",
    "disabled:active:translate-y-0",
    // Touch target floor (AAA)
    "min-h-[var(--ds-spacing-9)]",
  ],
  variants: {
    variant: {
      primary: [
        "bg-[color:var(--ds-button-primary-bg)]",
        "text-[color:var(--ds-button-primary-fg)]",
        "border-[color:var(--ds-button-primary-border)]",
        "hover:not-disabled:bg-[color:var(--ds-button-primary-bg-hover)]",
        "active:not-disabled:bg-[color:var(--ds-button-primary-bg-active)]",
      ],
      secondary: [
        "bg-[color:var(--ds-button-secondary-bg)]",
        "text-[color:var(--ds-button-secondary-fg)]",
        "border-[color:var(--ds-button-secondary-border)]",
        "hover:not-disabled:bg-[color:var(--ds-button-secondary-bg-hover)]",
        "active:not-disabled:bg-[color:var(--ds-button-secondary-bg-active)]",
      ],
      tertiary: [
        "bg-[color:var(--ds-bg-muted,transparent)]",
        "text-[color:var(--ds-text-secondary)]",
        "hover:not-disabled:bg-[color:var(--ds-button-ghost-bg-hover)]",
        "hover:not-disabled:text-[color:var(--ds-text-primary)]",
      ],
      ghost: [
        "bg-[color:var(--ds-button-ghost-bg)]",
        "text-[color:var(--ds-button-ghost-fg)]",
        "border-[color:var(--ds-button-ghost-border)]",
        "hover:not-disabled:bg-[color:var(--ds-button-ghost-bg-hover)]",
        "active:not-disabled:bg-[color:var(--ds-button-ghost-bg-active)]",
      ],
      outline: [
        "bg-transparent",
        "text-[color:var(--ds-text-primary)]",
        "border-[color:var(--ds-border-default)]",
        "hover:not-disabled:border-[color:var(--ds-border-strong)]",
        "hover:not-disabled:bg-[color:var(--ds-button-ghost-bg-hover)]",
        "active:not-disabled:bg-[color:var(--ds-button-ghost-bg-active)]",
      ],
      danger: [
        "bg-[color:var(--ds-button-danger-bg)]",
        "text-[color:var(--ds-button-danger-fg)]",
        "border-[color:var(--ds-button-danger-border)]",
        "hover:not-disabled:bg-[color:var(--ds-button-danger-bg-hover)]",
        "active:not-disabled:bg-[color:var(--ds-button-danger-bg-active)]",
      ],
      success: [
        "bg-[color:var(--ds-status-success-fg)]",
        "text-[color:var(--ds-status-success-bg)]",
        "border-transparent",
        "hover:not-disabled:opacity-[0.92]",
        "active:not-disabled:opacity-[0.85]",
      ],
      link: [
        "bg-transparent border-transparent",
        "px-0 min-h-0",
        "text-[color:var(--ds-text-accent)]",
        "underline underline-offset-[3px] decoration-[1px]",
        "hover:not-disabled:decoration-[2px]",
        "active:translate-y-0",
      ],
    },
    size: {
      xs: [
        "h-[var(--ds-spacing-7)] px-[var(--ds-spacing-2)]",
        "text-[length:var(--ds-font-size-body-xs)]",
        "font-[var(--ds-font-weight-body-md,500)]",
      ],
      sm: [
        "h-[var(--ds-spacing-8)] px-[var(--ds-spacing-3)]",
        "text-[length:var(--ds-font-size-body-sm)]",
        "font-[var(--ds-font-weight-body-md,500)]",
      ],
      md: [
        "h-[var(--ds-spacing-9)] px-[var(--ds-spacing-4)]",
        "text-[length:var(--ds-font-size-body-md)]",
        "font-[var(--ds-font-weight-body-md,500)]",
      ],
      lg: [
        "h-[var(--ds-spacing-10)] px-[var(--ds-spacing-5)]",
        "text-[length:var(--ds-font-size-body-md)]",
        "font-[var(--ds-font-weight-body-md,600)]",
      ],
      xl: [
        "h-[var(--ds-spacing-12)] px-[var(--ds-spacing-6)]",
        "text-[length:var(--ds-font-size-body-lg)]",
        "font-[var(--ds-font-weight-body-md,600)]",
      ],
    },
    fullWidth: {
      true: "w-full",
      false: "w-auto",
    },
    loading: {
      true: "cursor-progress",
      false: "",
    },
  },
  compoundVariants: [
    {
      variant: "link",
      size: ["xs", "sm", "md", "lg", "xl"],
      class: "h-auto px-0",
    },
  ],
  defaultVariants: {
    variant: "primary",
    size: "md",
    fullWidth: false,
    loading: false,
  },
});

export type ButtonVariantProps = TVVariantProps<typeof buttonVariants>;
