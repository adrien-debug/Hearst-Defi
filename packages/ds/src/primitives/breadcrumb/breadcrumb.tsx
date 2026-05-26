"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";
import { Slot } from "@ds/utils/slot";

import type {
  BreadcrumbItemProps,
  BreadcrumbLinkProps,
  BreadcrumbProps,
  BreadcrumbSeparatorProps,
} from "./breadcrumb.types";

const COLLAPSE_DEFAULT = 5;

/**
 * Breadcrumb container. Auto-collapses middle items when child segments
 * exceed `collapseAfter` (default 5).
 *
 * The middle group is replaced by an ellipsis. Consumers wanting a
 * full-fidelity dropdown can keep `collapseAfter={Infinity}` and roll
 * their own.
 */
export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  function Breadcrumb(
    {
      className,
      collapseAfter = COLLAPSE_DEFAULT,
      label = "Breadcrumb",
      children,
      ...rest
    },
    ref,
  ) {
    const items = React.Children.toArray(children).filter(Boolean);
    let visible = items;

    // Count only <BreadcrumbItem /> segments — separators added by consumer
    // or auto-injected below.
    if (items.length > collapseAfter) {
      const first = items[0];
      const last = items[items.length - 1];
      const lastVisible = items.slice(items.length - 2);
      const head = first ? [first] : [];
      visible = [
        ...head,
        <BreadcrumbItem key="__ellipsis" aria-label="More">
          <span aria-hidden>…</span>
        </BreadcrumbItem>,
        ...lastVisible,
      ];
      void last;
    }

    return (
      <nav
        ref={ref}
        aria-label={label}
        className={cn("ds-flex", className)}
        {...rest}
      >
        <ol
          className="ds-inline-flex ds-items-center ds-flex-wrap"
          style={{
            gap: "var(--ds-spacing-1)",
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {visible.map((child, idx) => (
            <React.Fragment key={idx}>
              {child}
              {idx < visible.length - 1 ? <BreadcrumbSeparator /> : null}
            </React.Fragment>
          ))}
        </ol>
      </nav>
    );
  },
);

export const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  function BreadcrumbItem({ className, current, ...rest }, ref) {
    return (
      <li
        ref={ref}
        aria-current={current ? "page" : undefined}
        className={cn(
          "ds-inline-flex ds-items-center",
          "ds-text-[var(--ds-font-size-body-sm)]",
          current
            ? "ds-text-[var(--ds-text-primary)] ds-font-medium"
            : "ds-text-[var(--ds-text-muted)]",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  BreadcrumbLinkProps
>(function BreadcrumbLink({ className, asChild, ...rest }, ref) {
  const Comp: React.ElementType = asChild ? Slot : "a";
  return (
    <Comp
      ref={ref}
      className={cn(
        "ds-inline-flex ds-items-center ds-rounded-[var(--ds-radius-sm)] ds-px-[var(--ds-spacing-1)]",
        "ds-text-[var(--ds-text-secondary)] hover:ds-text-[var(--ds-text-primary)]",
        "ds-transition-colors",
        "focus-visible:ds-outline focus-visible:ds-outline-2 focus-visible:ds-outline-[var(--ds-color-focus-ring)]",
        className,
      )}
      {...rest}
    />
  );
});

export const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  BreadcrumbSeparatorProps
>(function BreadcrumbSeparator({ className, children, ...rest }, ref) {
  return (
    <li
      ref={ref}
      role="presentation"
      aria-hidden
      className={cn(
        "ds-inline-flex ds-items-center ds-text-[var(--ds-text-faint)]",
        className,
      )}
      {...rest}
    >
      {children ?? "/"}
    </li>
  );
});
