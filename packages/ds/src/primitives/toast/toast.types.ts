import type * as React from "react";

export type ToastVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info";
export type ToastPosition =
  | "top-right"
  | "top-center"
  | "bottom-right"
  | "bottom-center";

export interface ToastOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: { label: React.ReactNode; onClick: () => void };
  variant?: ToastVariant;
  /** ms before auto-dismiss. `Infinity` to require manual close. */
  duration?: number;
}

export interface ToastInstance extends ToastOptions {
  id: string;
}

export interface ToastApi {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Default position for <ToastViewport/>. */
  position?: ToastPosition;
  /** Max toasts visible at once. */
  maxVisible?: number;
  /** Default duration in ms. */
  defaultDuration?: number;
}

export interface ToastViewportProps
  extends Omit<React.HTMLAttributes<HTMLOListElement>, "role"> {
  position?: ToastPosition;
}
