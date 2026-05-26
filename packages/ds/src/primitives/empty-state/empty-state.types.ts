import type * as React from "react";

export type EmptyStateVariant = "default" | "bordered" | "centered" | "minimal";

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: EmptyStateVariant;
}
