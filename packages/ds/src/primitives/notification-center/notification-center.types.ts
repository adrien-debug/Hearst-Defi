import type { HTMLAttributes, ReactNode } from "react";

export type NotificationCenterVariant = "default" | "glass";
export type NotificationCenterSize = "sm" | "md" | "lg";

export type NotificationSeverity =
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  /** ISO string, Date, or epoch ms. */
  ts: string | Date | number;
  read?: boolean;
  severity: NotificationSeverity;
  /** Optional CTA descriptor. */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationCenterProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  variant?: NotificationCenterVariant;
  size?: NotificationCenterSize;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NotificationItem[];
  onMarkAllRead?: () => void;
  onItemClick?: (item: NotificationItem) => void;
  /** Custom empty state node. Defaults to a built-in `EmptyState`-shaped fallback. */
  empty?: ReactNode;
  /** Optional header title. Defaults to "Notifications". */
  title?: string;
}
