import type * as React from "react";

export type TooltipSide = "top" | "right" | "bottom" | "left";
export type TooltipAlign = "start" | "center" | "end";
export type TooltipSize = "sm" | "md" | "lg";

export interface TooltipProps {
  /** Tooltip body. */
  content: React.ReactNode;
  /** Element that triggers the tooltip on hover/focus. */
  children: React.ReactElement;
  side?: TooltipSide;
  align?: TooltipAlign;
  /** ms before showing (default 300). */
  delayDuration?: number;
  /** ms before hiding (default 0). */
  closeDelay?: number;
  /** Gap between trigger and tooltip in px (default 6). */
  sideOffset?: number;
  size?: TooltipSize;
  /** Force open (controlled). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Disable the tooltip entirely. */
  disabled?: boolean;
  className?: string;
}
