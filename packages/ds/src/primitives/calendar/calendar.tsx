"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";

import type {
  CalendarProps,
  CalendarRange,
  CalendarValue,
} from "./calendar.types";

const MS_DAY = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function clamp(date: Date, min?: Date, max?: Date): Date {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_DAY);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function buildGrid(month: Date): Date[] {
  // 6 weeks × 7 days = 42 cells, starting Monday.
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7; // 0 = Monday
  const start = addDays(first, -dow);
  return Array.from({ length: 42 }).map((_, i) => addDays(start, i));
}

function isInRange(d: Date, range: CalendarRange): boolean {
  if (!range.from) return false;
  if (!range.to) return sameDay(d, range.from);
  const lo = range.from < range.to ? range.from : range.to;
  const hi = range.from < range.to ? range.to : range.from;
  return d >= startOfDay(lo) && d <= startOfDay(hi);
}

function isSelected(date: Date, value: CalendarValue): boolean {
  if (!value) return false;
  if (value instanceof Date) return sameDay(value, date);
  if (Array.isArray(value)) return value.some((d) => sameDay(d, date));
  return isInRange(date, value);
}

export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  function Calendar(
    {
      className,
      value,
      defaultValue = null,
      onChange,
      minDate,
      maxDate,
      disabled,
      multi = false,
      range = false,
      variant = "default",
      defaultMonth,
      locale = "en-US",
      ...rest
    },
    ref,
  ) {
    const [currentValue, setValue] = useControllableState<CalendarValue>({
      prop: value,
      defaultProp: defaultValue,
      onChange,
    });

    const [view, setView] = React.useState<Date>(() => {
      if (defaultMonth) return new Date(defaultMonth.getFullYear(), defaultMonth.getMonth(), 1);
      if (currentValue instanceof Date)
        return new Date(currentValue.getFullYear(), currentValue.getMonth(), 1);
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    const grid = React.useMemo(() => buildGrid(view), [view]);

    const dayNames = React.useMemo(() => {
      const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
      // Build labels starting Monday.
      const monday = new Date(2024, 0, 1); // a known Monday
      return Array.from({ length: 7 }).map((_, i) =>
        fmt.format(addDays(monday, i)),
      );
    }, [locale]);

    const monthLabel = React.useMemo(
      () =>
        new Intl.DateTimeFormat(locale, {
          month: "long",
          year: "numeric",
        }).format(view),
      [view, locale],
    );

    const isDisabled = React.useCallback(
      (d: Date) => {
        const today = startOfDay(d);
        if (minDate && today < startOfDay(minDate)) return true;
        if (maxDate && today > startOfDay(maxDate)) return true;
        if (disabled?.(today)) return true;
        return false;
      },
      [minDate, maxDate, disabled],
    );

    const selectDate = (d: Date) => {
      const clamped = clamp(startOfDay(d), minDate, maxDate);
      if (range) {
        const cur =
          currentValue && !(currentValue instanceof Date) && !Array.isArray(currentValue)
            ? currentValue
            : { from: null, to: null };
        if (!cur.from || (cur.from && cur.to)) {
          setValue({ from: clamped, to: null });
        } else {
          setValue({ from: cur.from, to: clamped });
        }
        return;
      }
      if (multi) {
        const arr = Array.isArray(currentValue) ? [...currentValue] : [];
        const idx = arr.findIndex((x) => sameDay(x, clamped));
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(clamped);
        setValue(arr);
        return;
      }
      setValue(clamped);
    };

    const [focused, setFocused] = React.useState<Date>(
      () => grid.find((d) => d.getMonth() === view.getMonth()) ?? grid[0]!,
    );

    React.useEffect(() => {
      setFocused((prev) =>
        prev && prev.getMonth() === view.getMonth()
          ? prev
          : (grid.find((d) => d.getMonth() === view.getMonth()) ?? grid[0]!),
      );
    }, [view, grid]);

    const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
      let next: Date | null = null;
      switch (e.key) {
        case "ArrowLeft":
          next = addDays(focused, -1);
          break;
        case "ArrowRight":
          next = addDays(focused, 1);
          break;
        case "ArrowUp":
          next = addDays(focused, -7);
          break;
        case "ArrowDown":
          next = addDays(focused, 7);
          break;
        case "PageUp":
          next = addMonths(focused, -1);
          break;
        case "PageDown":
          next = addMonths(focused, 1);
          break;
        case "Home":
          next = addDays(focused, -((focused.getDay() + 6) % 7));
          break;
        case "End":
          next = addDays(focused, 6 - ((focused.getDay() + 6) % 7));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (!isDisabled(focused)) selectDate(focused);
          return;
        default:
          return;
      }
      if (next) {
        e.preventDefault();
        setFocused(next);
        if (next.getMonth() !== view.getMonth()) {
          setView(new Date(next.getFullYear(), next.getMonth(), 1));
        }
      }
    };

    const compact = variant === "compact";

    return (
      <div
        ref={ref}
        role="application"
        aria-label="Calendar"
        className={cn(
          "ds-inline-flex ds-flex-col ds-gap-[var(--ds-spacing-2)]",
          "ds-p-[var(--ds-spacing-3)]",
          "ds-bg-[var(--ds-surface-raised)] ds-rounded-[var(--ds-radius-card)]",
          "ds-border ds-border-solid ds-border-[var(--ds-border-default)]",
          className,
        )}
        onKeyDown={onKey}
        {...rest}
      >
        <div className="ds-flex ds-items-center ds-justify-between">
          <button
            type="button"
            aria-label="Previous month"
            className="ds-rounded-[var(--ds-radius-sm)] ds-h-[var(--ds-spacing-7)] ds-w-[var(--ds-spacing-7)] hover:ds-bg-[var(--ds-bg-muted)]"
            onClick={() => setView(addMonths(view, -1))}
          >
            ‹
          </button>
          <div
            aria-live="polite"
            style={{
              fontSize: "var(--ds-font-size-body-sm)",
              fontWeight:
                "var(--ds-font-weight-semibold)" as React.CSSProperties["fontWeight"],
              color: "var(--ds-text-primary)",
            }}
          >
            {monthLabel}
          </div>
          <button
            type="button"
            aria-label="Next month"
            className="ds-rounded-[var(--ds-radius-sm)] ds-h-[var(--ds-spacing-7)] ds-w-[var(--ds-spacing-7)] hover:ds-bg-[var(--ds-bg-muted)]"
            onClick={() => setView(addMonths(view, 1))}
          >
            ›
          </button>
        </div>
        <div
          role="grid"
          aria-labelledby={undefined}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: compact ? "var(--ds-spacing-0_5)" : "var(--ds-spacing-1)",
          }}
        >
          {dayNames.map((d) => (
            <div
              key={d}
              role="columnheader"
              style={{
                textAlign: "center",
                fontSize: "var(--ds-font-size-caption)",
                color: "var(--ds-text-muted)",
                padding: "var(--ds-spacing-1) 0",
              }}
            >
              {d}
            </div>
          ))}
          {grid.map((d) => {
            const sel = isSelected(d, currentValue ?? null);
            const dis = isDisabled(d);
            const inMonth = d.getMonth() === view.getMonth();
            const isFocused = sameDay(d, focused);
            return (
              <button
                key={d.toISOString()}
                type="button"
                role="gridcell"
                aria-selected={sel}
                aria-disabled={dis}
                tabIndex={isFocused ? 0 : -1}
                disabled={dis}
                onClick={() => selectDate(d)}
                onFocus={() => setFocused(d)}
                className={cn(
                  "ds-text-[var(--ds-font-size-body-sm)] ds-rounded-[var(--ds-radius-sm)] ds-transition-colors",
                  compact
                    ? "ds-h-[var(--ds-spacing-6)]"
                    : "ds-h-[var(--ds-spacing-8)]",
                  sel
                    ? "ds-bg-[var(--ds-button-primary-bg)] ds-text-[var(--ds-button-primary-fg)]"
                    : "hover:ds-bg-[var(--ds-bg-muted)]",
                  !inMonth ? "ds-opacity-40" : "",
                  dis ? "ds-opacity-30 ds-cursor-not-allowed" : "",
                  "focus-visible:ds-outline focus-visible:ds-outline-2 focus-visible:ds-outline-[var(--ds-color-focus-ring)]",
                )}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);
