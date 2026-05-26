import type { ButtonHTMLAttributes, ReactNode } from "react";

import type { IconButtonVariantProps } from "./icon-button.variants";

export type IconButtonVariant = NonNullable<IconButtonVariantProps["variant"]>;
export type IconButtonSize = NonNullable<IconButtonVariantProps["size"]>;

export interface IconButtonProps
  extends Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "color" | "aria-label" | "children"
    >,
    IconButtonVariantProps {
  /** REQUIRED — describes the action for assistive tech. */
  "aria-label": string;
  /** Render via Radix Slot (anchor, Link…). */
  asChild?: boolean;
  /** Replace icon with spinner while preserving width. */
  loading?: boolean;
  /** The icon node (Lucide is the documented choice). */
  children: ReactNode;
}
