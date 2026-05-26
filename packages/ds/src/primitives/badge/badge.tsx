"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";
import { Slot } from "@ds/utils/slot";

import type { BadgeProps } from "./badge.types";
import { badgeVariants } from "./badge.variants";

const DOT_STYLE: React.CSSProperties = {
  width: "var(--ds-spacing-2)",
  height: "var(--ds-spacing-2)",
  borderRadius: "var(--ds-radius-full)",
  backgroundColor: "currentColor",
  display: "inline-block",
  flexShrink: 0,
};

const COUNT_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "calc(-1 * var(--ds-spacing-1_5))",
  right: "calc(-1 * var(--ds-spacing-1_5))",
  minWidth: "var(--ds-spacing-4)",
  height: "var(--ds-spacing-4)",
  padding: "0 var(--ds-spacing-1)",
  borderRadius: "var(--ds-radius-full)",
  backgroundColor: "var(--ds-button-danger-bg)",
  color: "var(--ds-button-danger-fg)",
  fontSize: "var(--ds-font-size-micro)",
  fontWeight: "var(--ds-font-weight-semibold)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};

/**
 * Badge — compact status / category tag.
 *
 * @example
 * <Badge variant="success" icon={<Check />}>Live</Badge>
 * <Badge count={3}>Inbox</Badge>
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(
    {
      asChild,
      className,
      variant = "default",
      size = "md",
      icon,
      count,
      dot,
      children,
      ...rest
    },
    ref,
  ) {
    const Comp: React.ElementType = asChild ? Slot : "span";
    const showDot = dot ?? variant === "dot";

    return (
      <Comp
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...rest}
      >
        {showDot ? <span aria-hidden style={DOT_STYLE} /> : null}
        {icon ? (
          <span aria-hidden className="ds-inline-flex ds-items-center">
            {icon}
          </span>
        ) : null}
        {children}
        {typeof count === "number" && count > 0 ? (
          <span aria-label={`${count} notifications`} style={COUNT_STYLE}>
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Comp>
    );
  },
);
