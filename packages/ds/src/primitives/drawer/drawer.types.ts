import type * as React from "react";

export type DrawerSide = "left" | "right" | "top" | "bottom";
export type DrawerSize = "sm" | "md" | "lg" | "xl" | "full";
export type DrawerVariant = DrawerSide;

export interface DrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Dismissible by Escape + backdrop (default true). */
  dismissible?: boolean;
  children?: React.ReactNode;
}

export interface DrawerTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export interface DrawerContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  side?: DrawerSide;
  size?: DrawerSize;
  "aria-label"?: string;
}

export interface DrawerHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface DrawerBodyProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface DrawerFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface DrawerTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4";
}
export interface DrawerCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}
