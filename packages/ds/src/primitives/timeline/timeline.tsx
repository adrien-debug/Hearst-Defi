"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type {
  TimelineItemProps,
  TimelineProps,
  TimelineVariant,
} from "./timeline.types";
import {
  TONE_TO_BG,
  TONE_TO_FG,
  timelineVariants,
} from "./timeline.variants";

interface TimelineCtx {
  variant: TimelineVariant;
}

const TimelineContext = React.createContext<TimelineCtx>({ variant: "default" });

export const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(
  function Timeline({ className, variant = "default", children, ...rest }, ref) {
    const arr = React.Children.toArray(children);
    return (
      <TimelineContext.Provider value={{ variant }}>
        <ol
          ref={ref}
          className={cn(timelineVariants({ variant }), className)}
          style={{ listStyle: "none", padding: 0, margin: 0 }}
          {...rest}
        >
          {arr.map((child, i) => {
            if (
              React.isValidElement<TimelineItemProps>(child) &&
              i === arr.length - 1
            ) {
              return React.cloneElement(child, { last: true });
            }
            return child;
          })}
        </ol>
      </TimelineContext.Provider>
    );
  },
);

export const TimelineItem = React.forwardRef<HTMLLIElement, TimelineItemProps>(
  function TimelineItem(
    {
      className,
      time,
      icon,
      variant: tone = "default",
      title,
      description,
      last,
      ...rest
    },
    ref,
  ) {
    const { variant } = React.useContext(TimelineContext);
    const dotSize =
      variant === "compact" ? "var(--ds-spacing-2_5)" : "var(--ds-spacing-3)";

    return (
      <li
        ref={ref}
        className={cn("ds-relative ds-flex ds-items-stretch", className)}
        style={{ gap: "var(--ds-spacing-3)" }}
        {...rest}
      >
        <div
          aria-hidden
          className="ds-relative ds-flex ds-flex-col ds-items-center"
          style={{ width: "var(--ds-spacing-5)" }}
        >
          <span
            className="ds-inline-flex ds-items-center ds-justify-center"
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "var(--ds-radius-full)",
              backgroundColor: TONE_TO_BG[tone],
              color: TONE_TO_FG[tone],
              border: `1px solid ${TONE_TO_FG[tone]}`,
              marginTop: "var(--ds-spacing-1)",
              flexShrink: 0,
            }}
          >
            {icon ? (
              <span
                style={{
                  display: "inline-flex",
                  width: "70%",
                  height: "70%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {icon}
              </span>
            ) : null}
          </span>
          {last ? null : (
            <span
              style={{
                flex: 1,
                width: "1px",
                backgroundColor: "var(--ds-border-subtle)",
                marginTop: "var(--ds-spacing-1)",
              }}
            />
          )}
        </div>
        <div
          className="ds-flex ds-flex-col"
          style={{
            gap: "var(--ds-spacing-1)",
            paddingBottom: last ? 0 : "var(--ds-spacing-2)",
          }}
        >
          {time ? (
            <div
              style={{
                fontSize: "var(--ds-font-size-caption)",
                color: "var(--ds-text-muted)",
                lineHeight: "var(--ds-line-height-caption)",
              }}
            >
              {time}
            </div>
          ) : null}
          <div
            style={{
              fontSize: "var(--ds-font-size-body-sm)",
              fontWeight:
                "var(--ds-font-weight-medium)" as React.CSSProperties["fontWeight"],
              color: "var(--ds-text-primary)",
              lineHeight: "var(--ds-line-height-body-sm)",
            }}
          >
            {title}
          </div>
          {description && variant !== "compact" ? (
            <div
              style={{
                fontSize: "var(--ds-font-size-body-sm)",
                color: "var(--ds-text-muted)",
                lineHeight: "var(--ds-line-height-body-sm)",
              }}
            >
              {description}
            </div>
          ) : null}
        </div>
      </li>
    );
  },
);
