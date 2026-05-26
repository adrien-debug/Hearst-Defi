"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type {
  ActivityFeedItem,
  ActivityFeedProps,
} from "./activity-feed.types";

const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

function defaultRelative(timestamp: string, now: number): string {
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return timestamp;
  const diff = Math.max(0, now - t);
  if (diff < MIN) return "just now";
  if (diff < HR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HR)}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}

function groupByDay(items: ActivityFeedItem[]): Map<string, ActivityFeedItem[]> {
  const out = new Map<string, ActivityFeedItem[]>();
  for (const item of items) {
    const d = new Date(item.timestamp);
    const key = Number.isNaN(d.getTime())
      ? "Unknown"
      : d.toISOString().slice(0, 10);
    const arr = out.get(key) ?? [];
    arr.push(item);
    out.set(key, arr);
  }
  return out;
}

function Row({
  item,
  rel,
  compact,
}: {
  item: ActivityFeedItem;
  rel: string;
  compact: boolean;
}) {
  return (
    <li
      className={cn(
        "ds-flex ds-items-start ds-gap-[var(--ds-spacing-3)]",
        compact
          ? "ds-py-[var(--ds-spacing-1_5)]"
          : "ds-py-[var(--ds-spacing-2_5)]",
      )}
    >
      {item.avatar ? <div className="ds-shrink-0">{item.avatar}</div> : null}
      <div className="ds-min-w-0 ds-flex-1">
        <div
          style={{
            fontSize: "var(--ds-font-size-body-sm)",
            lineHeight: "var(--ds-line-height-body-sm)",
            color: "var(--ds-text-primary)",
          }}
        >
          <span style={{ fontWeight: 600 }}>{item.user}</span>{" "}
          <span style={{ color: "var(--ds-text-secondary)" }}>{item.verb}</span>
          {item.target ? (
            <>
              {" "}
              <span style={{ fontWeight: 500 }}>{item.target}</span>
            </>
          ) : null}
        </div>
        {item.meta && !compact ? (
          <div
            style={{
              fontSize: "var(--ds-font-size-body-xs)",
              color: "var(--ds-text-muted)",
              marginTop: "var(--ds-spacing-0_5)",
            }}
          >
            {item.meta}
          </div>
        ) : null}
      </div>
      <time
        dateTime={item.timestamp}
        style={{
          fontSize: "var(--ds-font-size-caption)",
          color: "var(--ds-text-faint)",
          whiteSpace: "nowrap",
          marginTop: "var(--ds-spacing-0_5)",
        }}
      >
        {rel}
      </time>
    </li>
  );
}

export const ActivityFeed = React.forwardRef<HTMLDivElement, ActivityFeedProps>(
  function ActivityFeed(
    {
      className,
      items,
      variant = "default",
      formatRelative,
      now,
      ...rest
    },
    ref,
  ) {
    const refNow = now ?? Date.now();
    const rel = (ts: string) =>
      formatRelative ? formatRelative(ts) : defaultRelative(ts, refNow);

    if (variant === "grouped") {
      const groups = groupByDay(items);
      return (
        <div
          ref={ref}
          className={cn("ds-flex ds-flex-col ds-gap-[var(--ds-spacing-4)]", className)}
          {...rest}
        >
          {Array.from(groups.entries()).map(([day, group]) => (
            <section key={day} aria-label={`Activity on ${day}`}>
              <h3
                style={{
                  fontSize: "var(--ds-font-size-overline)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--ds-letter-spacing-overline)",
                  color: "var(--ds-text-muted)",
                  margin: "0 0 var(--ds-spacing-1) 0",
                }}
              >
                {day}
              </h3>
              <ol
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  borderTop: "1px solid var(--ds-border-subtle)",
                }}
              >
                {group.map((it) => (
                  <Row key={it.id} item={it} rel={rel(it.timestamp)} compact={false} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn(className)} {...rest}>
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((it) => (
            <Row
              key={it.id}
              item={it}
              rel={rel(it.timestamp)}
              compact={variant === "compact"}
            />
          ))}
        </ol>
      </div>
    );
  },
);
