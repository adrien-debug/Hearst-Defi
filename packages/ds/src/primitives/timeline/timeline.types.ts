import type * as React from "react";

export type TimelineVariant = "default" | "compact" | "rich";

export type TimelineItemTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface TimelineProps extends React.HTMLAttributes<HTMLOListElement> {
  variant?: TimelineVariant;
}

export interface TimelineItemProps
  extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "title"> {
  /** Displayed in the left rail (or as a meta line in compact variant). */
  time?: React.ReactNode;
  /** Optional icon rendered inside the dot. */
  icon?: React.ReactNode;
  /** Tone of the dot. */
  variant?: TimelineItemTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Hide the connecting line below this item (set on the last item). */
  last?: boolean;
}
