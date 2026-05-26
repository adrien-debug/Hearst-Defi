import type * as React from "react";

export type LoaderVariant = "spinner" | "dots" | "bars" | "pulse" | "progress";
export type LoaderSize = "sm" | "md" | "lg" | "xl";

export interface LoaderProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: LoaderVariant;
  size?: LoaderSize;
  /** Accessible label exposed via aria-label. */
  label?: string;
  /** For progress variant: 0..1, otherwise indeterminate. */
  value?: number;
}
