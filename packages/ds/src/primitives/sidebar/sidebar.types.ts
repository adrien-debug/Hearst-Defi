import type * as React from "react";

export type SidebarVariant = "default" | "floating" | "inset";

export interface SidebarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Expanded width in px (default 240). */
  expandedWidth?: number;
  /** Collapsed width in px (default 64). */
  collapsedWidth?: number;
  variant?: SidebarVariant;
  /** Accessible label (defaults to "Sidebar"). */
  "aria-label"?: string;
}

export interface SidebarSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
}

export interface SidebarHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface SidebarBodyProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface SidebarFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface SidebarSeparatorProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export interface SidebarItemProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "href"> {
  icon?: React.ReactNode;
  label: React.ReactNode;
  active?: boolean;
  badge?: React.ReactNode;
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
}
