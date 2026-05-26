import type * as React from "react";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
export type ModalVariant = "default" | "centered" | "sheet-bottom";

export interface ModalProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Close on Escape (default true). */
  closeOnEscape?: boolean;
  /** Close on backdrop click (default true). */
  closeOnBackdrop?: boolean;
  /** Restore focus on close (default true). */
  restoreFocus?: boolean;
  children?: React.ReactNode;
}

export interface ModalTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export interface ModalContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: ModalSize;
  variant?: ModalVariant;
  /** Optional accessible label when no <ModalTitle/> is rendered. */
  "aria-label"?: string;
}

export interface ModalHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface ModalBodyProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface ModalFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}
export interface ModalTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4";
}
export interface ModalDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}
export interface ModalCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}
