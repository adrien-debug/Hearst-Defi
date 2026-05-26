import type * as React from "react";

export type PopoverVariant = "default" | "menu" | "rich";
export type PopoverSize = "sm" | "md" | "lg";
export type PopoverSide = "top" | "right" | "bottom" | "left";
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export interface PopoverTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export interface PopoverContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PopoverVariant;
  size?: PopoverSize;
  side?: PopoverSide;
  align?: PopoverAlign;
  sideOffset?: number;
  "aria-label"?: string;
}

export interface PopoverHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface PopoverFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface PopoverCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}
