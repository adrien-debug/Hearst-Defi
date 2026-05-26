"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type { SkeletonProps } from "./skeleton.types";
import { skeletonVariants } from "./skeleton.variants";

const SHIMMER_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "linear-gradient(90deg, transparent 0%, var(--ds-surface-overlay, var(--ds-border-default)) 50%, transparent 100%)",
  animation:
    "ds-skeleton-shimmer var(--ds-motion-duration-2xl) linear infinite",
  willChange: "transform",
};

/**
 * Skeleton — placeholder shimmer for loading states.
 *
 * For text variant pass `lines` to render multiple bars.
 */
export const Skeleton = React.forwardRef<HTMLSpanElement, SkeletonProps>(
  function Skeleton(
    {
      className,
      variant = "text",
      lines,
      width,
      height,
      style,
      "aria-label": ariaLabel = "Loading",
      ...rest
    },
    ref,
  ) {
    if (variant === "text" && typeof lines === "number" && lines > 1) {
      return (
        <span
          ref={ref}
          role="status"
          aria-label={ariaLabel}
          className={cn("ds-flex ds-flex-col", className)}
          style={{
            gap: "var(--ds-spacing-2)",
            ...style,
          }}
          {...rest}
        >
          {Array.from({ length: lines }).map((_, i) => (
            <span
              key={i}
              className={cn(skeletonVariants({ variant: "text" }))}
              style={{
                width: i === lines - 1 ? "60%" : "100%",
              }}
            >
              <span aria-hidden style={SHIMMER_STYLE} />
            </span>
          ))}
        </span>
      );
    }

    return (
      <span
        ref={ref}
        role="status"
        aria-label={ariaLabel}
        className={cn(skeletonVariants({ variant }), className)}
        style={{ width, height, ...style }}
        {...rest}
      >
        <span aria-hidden style={SHIMMER_STYLE} />
      </span>
    );
  },
);
