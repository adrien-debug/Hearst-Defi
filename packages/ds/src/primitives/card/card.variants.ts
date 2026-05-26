import { cva } from "@ds/utils/cva";

/**
 * Card surface — token-driven only. Every value resolves to a `var(--ds-*)`.
 */
export const cardVariants = cva(
  [
    "ds-block ds-relative ds-w-full ds-text-left",
    "ds-transition-[transform,box-shadow,background-color,border-color]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "",
        elevated: "",
        outlined: "",
        filled: "",
        glass: "",
        ghost: "",
      },
      padding: {
        none: "",
        sm: "",
        md: "",
        lg: "",
      },
      radius: {
        sm: "",
        md: "",
        lg: "",
        xl: "",
      },
      interactive: {
        true: [
          "ds-cursor-pointer",
          "hover:ds-translate-y-[calc(-1*var(--ds-spacing-0_5))]",
          "focus-visible:ds-outline-none",
          "focus-visible:ds-shadow-[var(--ds-shadow-focus-ring)]",
        ].join(" "),
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
      radius: "lg",
      interactive: false,
    },
  },
);
