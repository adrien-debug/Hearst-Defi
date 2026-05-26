import type * as React from "react";

export type PaginationVariant = "default" | "minimal" | "dots";

export interface PaginationProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Number of sibling pages around the current page (default: 1). */
  siblings?: number;
  variant?: PaginationVariant;
  /** ARIA label of the nav. */
  label?: string;
}
