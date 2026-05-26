import type * as React from "react";

export type TabsVariant = "default" | "pills" | "underline" | "enclosed";
export type TabsSize = "sm" | "md" | "lg";
export type TabsOrientation = "horizontal" | "vertical";

export interface TabDescriptor {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  content?: React.ReactNode;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  size?: TabsSize;
  orientation?: TabsOrientation;
  /** Convenience API — pass items inline. If omitted, use composition. */
  tabs?: TabDescriptor[];
}

export interface TabsListProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  /** Keep DOM mounted while inactive (default false). */
  forceMount?: boolean;
}
