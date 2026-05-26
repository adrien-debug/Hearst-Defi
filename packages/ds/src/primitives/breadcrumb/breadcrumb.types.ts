import type * as React from "react";

export type BreadcrumbProps = React.HTMLAttributes<HTMLElement> & {
  /** When more than `collapseAfter` segments, middle ones collapse into "...". */
  collapseAfter?: number;
  label?: string;
};

export type BreadcrumbItemProps = React.HTMLAttributes<HTMLLIElement> & {
  current?: boolean;
};

export interface BreadcrumbLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
}

export type BreadcrumbSeparatorProps = React.HTMLAttributes<HTMLLIElement>;
