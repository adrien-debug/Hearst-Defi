import type * as React from "react";

export type TableVariant = "default" | "striped" | "bordered" | "minimal";
export type TableSize = "sm" | "md" | "lg";

export interface TableProps
  extends React.TableHTMLAttributes<HTMLTableElement> {
  variant?: TableVariant;
  size?: TableSize;
  /** Sticky `<thead>` (requires the wrapping container to scroll). */
  stickyHeader?: boolean;
}

export type TheadProps = React.HTMLAttributes<HTMLTableSectionElement>;
export type TbodyProps = React.HTMLAttributes<HTMLTableSectionElement>;
export type TfootProps = React.HTMLAttributes<HTMLTableSectionElement>;
export interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  interactive?: boolean;
}
export interface ThProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  /** "asc" | "desc" | "none" — controls the visual sort indicator. */
  direction?: "asc" | "desc" | "none";
  align?: "start" | "center" | "end";
}
export interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "start" | "center" | "end";
  numeric?: boolean;
}
