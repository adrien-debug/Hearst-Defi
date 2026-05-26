"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type { EmptyStateProps } from "./empty-state.types";
import { emptyStateVariants } from "./empty-state.variants";

/**
 * EmptyState — used in lists, tables, dashboards when no data exists.
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState(
    {
      className,
      variant = "default",
      icon,
      illustration,
      title,
      description,
      action,
      ...rest
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        role="status"
        className={cn(emptyStateVariants({ variant }), className)}
        {...rest}
      >
        {illustration ? (
          <div
            aria-hidden
            className="ds-mb-[var(--ds-spacing-2)] ds-flex ds-items-center ds-justify-center"
          >
            {illustration}
          </div>
        ) : null}
        {icon ? (
          <div
            aria-hidden
            className={cn(
              "ds-inline-flex ds-items-center ds-justify-center",
              "ds-h-[var(--ds-spacing-12)] ds-w-[var(--ds-spacing-12)]",
              "ds-rounded-[var(--ds-radius-full)]",
              "ds-bg-[var(--ds-surface-overlay)] ds-text-[var(--ds-icon-muted)]",
            )}
          >
            {icon}
          </div>
        ) : null}
        <div
          className="ds-text-[var(--ds-font-size-heading-sm)] ds-font-semibold ds-text-[var(--ds-text-primary)]"
          style={{
            fontSize: "var(--ds-font-size-heading-sm)",
            lineHeight: "var(--ds-line-height-heading-sm)",
            fontWeight: "var(--ds-font-weight-heading-sm)" as React.CSSProperties["fontWeight"],
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            className="ds-text-[var(--ds-text-muted)]"
            style={{
              fontSize: "var(--ds-font-size-body-sm)",
              lineHeight: "var(--ds-line-height-body-sm)",
              maxWidth: "var(--ds-spacing-96)",
            }}
          >
            {description}
          </div>
        ) : null}
        {action ? (
          <div className="ds-mt-[var(--ds-spacing-2)]">{action}</div>
        ) : null}
      </div>
    );
  },
);
