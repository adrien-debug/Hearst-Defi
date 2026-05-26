import type * as React from "react";

export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline"
  | "dot";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Numeric count rendered as a small bubble in the top-right corner. */
  count?: number;
  /** Show a leading status dot. Auto-true when `variant === "dot"`. */
  dot?: boolean;
  /** Force using `asChild` Slot-style polymorphism. */
  asChild?: boolean;
}
