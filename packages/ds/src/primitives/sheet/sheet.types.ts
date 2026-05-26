import type * as React from "react";

export interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Heights as fractions of viewport height (e.g. [0.4, 0.7, 1]). Default `[0.5]`. */
  snapPoints?: number[];
  /** Initial snap index. Defaults to last (largest). */
  defaultSnapIndex?: number;
  /** Dismissible by drag-down past first snap + backdrop. */
  dismissible?: boolean;
  /** Viewport width threshold (px) below which behaves as bottom sheet. Default 640. */
  mobileBreakpoint?: number;
  children?: React.ReactNode;
}

export interface SheetTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export interface SheetContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  "aria-label"?: string;
}

export interface SheetHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface SheetBodyProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface SheetFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface SheetTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4";
}
export interface SheetHandleProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface SheetCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}
