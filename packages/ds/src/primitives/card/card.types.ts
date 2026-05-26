import type * as React from "react";
import type { VariantProps } from "@ds/utils/cva";

import type { cardVariants } from "./card.variants";

export type CardVariant =
  | "default"
  | "elevated"
  | "outlined"
  | "filled"
  | "glass"
  | "ghost";
export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardRadius = "sm" | "md" | "lg" | "xl";
export type CardSize = CardPadding;

export interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
    Omit<VariantProps<typeof cardVariants>, "interactive"> {
  /** When true, adds hover lift + cursor-pointer + role/tabIndex semantics. */
  interactive?: boolean;
  /** Polymorphic via Radix Slot is overkill here — keep simple. */
  asChild?: boolean;
}

export interface CardSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}
