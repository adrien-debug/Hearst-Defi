import type { HTMLAttributes, ReactNode } from "react";

export type SpotlightSearchVariant = "default" | "compact";
export type SpotlightSearchSize = "sm" | "md" | "lg";

export interface SpotlightItem {
  id: string;
  label: string;
  description?: string;
  href?: string;
  icon?: ReactNode;
}

export interface SpotlightSection {
  section: string;
  items: SpotlightItem[];
}

export interface SpotlightSearchProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  variant?: SpotlightSearchVariant;
  size?: SpotlightSearchSize;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Async query callback. Should return grouped sections. */
  onQuery: (q: string) => Promise<SpotlightSection[]>;
  /** Optional select callback. Defaults to `window.location.assign(item.href)`. */
  onSelect?: (item: SpotlightItem) => void;
  placeholder?: string;
  /** Ids surfaced first when the query is empty. */
  recentIds?: string[];
  /** Optional emptyMessage override. */
  emptyMessage?: string;
}
