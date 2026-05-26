import type * as React from "react";

export type SkeletonVariant = "text" | "avatar" | "thumbnail" | "card" | "row";

export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: SkeletonVariant;
  /** Number of lines for text variant. */
  lines?: number;
  /** Override width (e.g. "60%"). */
  width?: string | number;
  /** Override height (e.g. "1rem"). */
  height?: string | number;
}
