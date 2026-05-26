import type * as React from "react";

export type ActivityFeedVariant = "default" | "compact" | "grouped";

export interface ActivityFeedItem {
  id: string;
  /** Avatar element (caller supplies <Avatar />). */
  avatar?: React.ReactNode;
  user: React.ReactNode;
  /** Verb like "deposited", "withdrew", "rebalanced". */
  verb: React.ReactNode;
  target?: React.ReactNode;
  /** Either an absolute ISO timestamp or a relative string. */
  timestamp: string;
  meta?: React.ReactNode;
}

export interface ActivityFeedProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ActivityFeedItem[];
  variant?: ActivityFeedVariant;
  /** Override the relative time formatter (default formats e.g. "5m ago"). */
  formatRelative?: (timestamp: string) => string;
  /** "Reference now" for deterministic formatting (defaults to Date.now()). */
  now?: number;
}
