"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type { LoaderProps } from "./loader.types";
import { loaderVariants } from "./loader.variants";

/**
 * Loader — 5 visual variants for indeterminate work.
 *
 * Animations honor `prefers-reduced-motion`: motion tokens collapse to 1ms,
 * leaving the visual present but static.
 */
export const Loader = React.forwardRef<HTMLSpanElement, LoaderProps>(
  function Loader(
    { className, variant = "spinner", size = "md", label = "Loading", value, style, ...rest },
    ref,
  ) {
    const role = "status";
    const ariaProps: Record<string, string | number> = {
      role,
      "aria-label": label,
      "aria-live": "polite",
    };
    if (variant === "progress") {
      ariaProps["aria-valuemin"] = 0;
      ariaProps["aria-valuemax"] = 100;
      if (typeof value === "number")
        ariaProps["aria-valuenow"] = Math.round(value * 100);
    }

    if (variant === "progress") {
      return (
        <span
          ref={ref}
          {...ariaProps}
          className={cn(
            "ds-inline-block ds-relative ds-h-[var(--ds-spacing-1)] ds-w-full ds-overflow-hidden",
            "ds-rounded-[var(--ds-radius-pill)] ds-bg-[var(--ds-border-subtle)]",
            className,
          )}
          style={style}
          {...rest}
        >
          <span
            style={{
              display: "block",
              height: "100%",
              width:
                typeof value === "number"
                  ? `${Math.max(0, Math.min(1, value)) * 100}%`
                  : "33%",
              backgroundColor: "var(--ds-color-accent-500)",
              borderRadius: "var(--ds-radius-pill)",
              transition: "width var(--ds-motion-duration-base) var(--ds-motion-ease-out)",
              animation:
                typeof value === "number"
                  ? undefined
                  : "ds-loader-progress-indeterminate var(--ds-motion-duration-2xl) var(--ds-motion-ease-inOut) infinite",
              willChange: "transform",
            }}
          />
        </span>
      );
    }

    return (
      <span
        ref={ref}
        {...ariaProps}
        className={cn(loaderVariants({ size }), className)}
        style={style}
        {...rest}
      >
        {variant === "spinner" ? <SpinnerSvg /> : null}
        {variant === "dots" ? <DotsSvg /> : null}
        {variant === "bars" ? <BarsSvg /> : null}
        {variant === "pulse" ? <PulseSvg /> : null}
      </span>
    );
  },
);

function SpinnerSvg() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      aria-hidden
      style={{
        animation:
          "ds-loader-spin var(--ds-motion-duration-2xl) linear infinite",
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function DotsSvg() {
  return (
    <svg viewBox="0 0 24 8" width="100%" height="100%" aria-hidden>
      <circle cx="4" cy="4" r="2.5" fill="currentColor" style={{ animation: "ds-loader-bounce var(--ds-motion-duration-xl) var(--ds-motion-ease-inOut) infinite" }} />
      <circle cx="12" cy="4" r="2.5" fill="currentColor" style={{ animation: "ds-loader-bounce var(--ds-motion-duration-xl) var(--ds-motion-ease-inOut) -0.16s infinite" }} />
      <circle cx="20" cy="4" r="2.5" fill="currentColor" style={{ animation: "ds-loader-bounce var(--ds-motion-duration-xl) var(--ds-motion-ease-inOut) -0.32s infinite" }} />
    </svg>
  );
}

function BarsSvg() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <rect x="2" y="6" width="3" height="12" fill="currentColor" style={{ animation: "ds-loader-bar var(--ds-motion-duration-xl) ease-in-out infinite" }} />
      <rect x="10" y="6" width="3" height="12" fill="currentColor" style={{ animation: "ds-loader-bar var(--ds-motion-duration-xl) ease-in-out -0.16s infinite" }} />
      <rect x="18" y="6" width="3" height="12" fill="currentColor" style={{ animation: "ds-loader-bar var(--ds-motion-duration-xl) ease-in-out -0.32s infinite" }} />
    </svg>
  );
}

function PulseSvg() {
  return (
    <span
      aria-hidden
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--ds-radius-full)",
        backgroundColor: "currentColor",
        animation:
          "ds-loader-pulse var(--ds-motion-duration-xl) var(--ds-motion-ease-inOut) infinite",
      }}
    />
  );
}
