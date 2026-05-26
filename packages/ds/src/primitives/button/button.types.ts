import type { ButtonHTMLAttributes, ReactNode } from "react";

import type { ButtonVariantProps } from "./button.variants";

export type ButtonVariant = NonNullable<ButtonVariantProps["variant"]>;
export type ButtonSize = NonNullable<ButtonVariantProps["size"]>;

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    ButtonVariantProps {
  /**
   * Render via Radix Slot to merge props onto a child element (anchor, Link…).
   * When true, children must be a single React element.
   */
  asChild?: boolean;
  /** Show a leading icon to the left of the label. */
  iconLeft?: ReactNode;
  /** Show a trailing icon to the right of the label. */
  iconRight?: ReactNode;
  /** Replace label with a spinner while preserving width. */
  loading?: boolean;
  /** Accessible label announced by AT when the visible label is icon-only. */
  ariaLabel?: string;
  /** Children (label). */
  children?: ReactNode;
}
