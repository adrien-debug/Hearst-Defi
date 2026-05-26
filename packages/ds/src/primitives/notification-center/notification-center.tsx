"use client";

/**
 * @ds/core/primitives/notification-center
 *
 * Slide-in panel from the right edge. Groups notifications by day
 * (Today / Yesterday / Older).
 */

import { forwardRef, useId, useMemo, useRef } from "react";
import type { ForwardedRef } from "react";
import { BellOff, X } from "lucide-react";

import { cn } from "../../utils/cn";
import { useEscapeKey, useFocusTrap } from "../../utils/a11y";
import { composeRefs } from "../../utils/compose-refs";

import { notificationCenterVariants } from "./notification-center.variants";
import type {
  NotificationCenterProps,
  NotificationItem,
} from "./notification-center.types";

function toDate(ts: NotificationItem["ts"]): Date {
  if (ts instanceof Date) return ts;
  if (typeof ts === "number") return new Date(ts);
  return new Date(ts);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

type GroupKey = "Today" | "Yesterday" | "Older";

function groupKey(ts: Date, now: Date): GroupKey {
  const todayStart = startOfDay(now);
  const oneDay = 24 * 60 * 60 * 1000;
  const itemStart = startOfDay(ts);
  if (itemStart === todayStart) return "Today";
  if (itemStart === todayStart - oneDay) return "Yesterday";
  return "Older";
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const NotificationCenter = forwardRef<
  HTMLDivElement,
  NotificationCenterProps
>(function NotificationCenter(
  {
    open,
    onOpenChange,
    items,
    onMarkAllRead,
    onItemClick,
    empty,
    title = "Notifications",
    variant,
    size,
    className,
    ...rest
  }: NotificationCenterProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const styles = notificationCenterVariants({ variant, size });
  const panelRef = useRef<HTMLDivElement>(null);
  const headerId = useId();

  useFocusTrap(panelRef, open);
  useEscapeKey(() => onOpenChange(false), open);

  const grouped = useMemo(() => {
    const now = new Date();
    const buckets: Record<GroupKey, NotificationItem[]> = {
      Today: [],
      Yesterday: [],
      Older: [],
    };
    const ordered = [...items].sort(
      (a, b) => toDate(b.ts).getTime() - toDate(a.ts).getTime(),
    );
    for (const it of ordered) {
      buckets[groupKey(toDate(it.ts), now)].push(it);
    }
    return buckets;
  }, [items]);

  const unread = items.filter((i) => !i.read).length;

  return (
    <>
      <div
        className={styles.backdrop()}
        data-state={open ? "open" : "closed"}
        aria-hidden="true"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={composeRefs(ref, panelRef)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headerId}
        data-state={open ? "open" : "closed"}
        className={cn(styles.panel(), className)}
        {...rest}
      >
        <div className={styles.header()}>
          <span id={headerId} className={styles.headerTitle()}>
            {title}
            {unread > 0 ? (
              <span className="ml-[var(--ds-spacing-2)] text-[color:var(--ds-color-accent-500)] tabular-nums">
                ({unread})
              </span>
            ) : null}
          </span>
          <div className={styles.headerActions()}>
            {onMarkAllRead && unread > 0 ? (
              <button
                type="button"
                className={styles.markAllButton()}
                onClick={onMarkAllRead}
              >
                Mark all read
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Close notifications"
              className={styles.closeBtn()}
              onClick={() => onOpenChange(false)}
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        </div>

        <div className={styles.list()}>
          {items.length === 0 ? (
            empty ?? (
              <div className={styles.empty()}>
                <BellOff aria-hidden="true" size={32} />
                <div className={styles.emptyTitle()}>You are all caught up</div>
                <div>Nothing new — check back later.</div>
              </div>
            )
          ) : (
            (["Today", "Yesterday", "Older"] as const).map((k) => {
              const arr = grouped[k];
              if (arr.length === 0) return null;
              return (
                <div key={k}>
                  <div className={styles.groupLabel()}>{k}</div>
                  {arr.map((it) => {
                    const d = toDate(it.ts);
                    return (
                      <div
                        key={it.id}
                        role="button"
                        tabIndex={0}
                        className={styles.item()}
                        onClick={() => onItemClick?.(it)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onItemClick?.(it);
                          }
                        }}
                      >
                        <span
                          className={styles.severityDot()}
                          data-sev={it.severity}
                          aria-hidden="true"
                        />
                        <div className={styles.itemBody()}>
                          <div className={styles.itemTitleRow()}>
                            <span className={styles.itemTitle()}>
                              {it.title}
                              {!it.read ? (
                                <span
                                  className={styles.unreadBadge()}
                                  aria-label="unread"
                                />
                              ) : null}
                            </span>
                            <span className={styles.itemTime()}>
                              {formatTime(d)}
                            </span>
                          </div>
                          {it.body ? (
                            <span className={styles.itemBodyText()}>
                              {it.body}
                            </span>
                          ) : null}
                          {it.action ? (
                            <button
                              type="button"
                              className={styles.itemAction()}
                              onClick={(e) => {
                                e.stopPropagation();
                                it.action?.onClick();
                              }}
                            >
                              {it.action.label}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
});

NotificationCenter.displayName = "NotificationCenter";
