"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type { TopbarProps, TopbarVariant } from "./topbar.types";
import { topbarVariants } from "./topbar.variants";

const SLOT_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--ds-spacing-2)",
};

function rootStyle(
  variant: TopbarVariant,
  sticky: boolean,
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--ds-spacing-4)",
    width: "100%",
    minHeight: "var(--ds-spacing-14)",
    padding: "var(--ds-spacing-2) var(--ds-spacing-4)",
    color: "var(--ds-text-primary)",
    backgroundColor: "var(--ds-surface-base)",
    zIndex: "var(--ds-z-sticky)" as unknown as number,
  };
  if (sticky) {
    base.position = "sticky";
    base.top = 0;
  }
  if (variant === "bordered") {
    base.borderBottom = "1px solid var(--ds-border-default)";
  } else if (variant === "floating") {
    base.borderRadius = "var(--ds-radius-xl)";
    base.boxShadow = "var(--ds-shadow-md)";
    base.margin = "var(--ds-spacing-3)";
    base.backgroundColor = "var(--ds-surface-raised)";
  } else if (variant === "glass") {
    base.backgroundColor = "var(--ds-glass-bg)";
    base.backdropFilter = "blur(var(--ds-glass-blur))";
    base.WebkitBackdropFilter = "blur(var(--ds-glass-blur))";
    base.borderBottom = "1px solid var(--ds-glass-border)";
  }
  return base;
}

export const Topbar = React.forwardRef<HTMLElement, TopbarProps>(function Topbar(
  {
    variant = "default",
    sticky = true,
    left,
    center,
    right,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  return (
    <header
      ref={ref}
      role="banner"
      className={cn(topbarVariants({ variant, sticky }), className)}
      style={{ ...rootStyle(variant, sticky), ...style }}
      {...rest}
    >
      {children ?? (
        <>
          <div style={{ ...SLOT_STYLE, flexShrink: 0 }}>{left}</div>
          <div
            style={{
              ...SLOT_STYLE,
              flex: 1,
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            {center}
          </div>
          <div style={{ ...SLOT_STYLE, flexShrink: 0 }}>{right}</div>
        </>
      )}
    </header>
  );
});
