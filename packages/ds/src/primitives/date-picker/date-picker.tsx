"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";
import { useId } from "@ds/utils/id";

import { Calendar } from "../calendar/calendar";
import type { CalendarRange, CalendarValue } from "../calendar/calendar.types";

import type { DatePickerProps } from "./date-picker.types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function defaultFormat(d: Date, showTime: boolean): string {
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (!showTime) return date;
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatValue(
  value: Date | CalendarRange | null | undefined,
  showTime: boolean,
  fmt?: (d: Date) => string,
): string {
  if (!value) return "";
  if (value instanceof Date) return fmt ? fmt(value) : defaultFormat(value, showTime);
  const f = (d: Date) => (fmt ? fmt(d) : defaultFormat(d, showTime));
  if (value.from && value.to) return `${f(value.from)} → ${f(value.to)}`;
  if (value.from) return f(value.from);
  return "";
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker(
    {
      className,
      value,
      defaultValue = null,
      onChange,
      format,
      min,
      max,
      showTime = false,
      range = false,
      placeholder = "Select date",
      id: idProp,
      ...rest
    },
    ref,
  ) {
    const [currentValue, setValue] = useControllableState<
      Date | CalendarRange | null
    >({
      prop: value,
      defaultProp: defaultValue,
      onChange,
    });

    const [open, setOpen] = React.useState(false);
    const inputId = useId(idProp ?? "date-picker");
    const popId = `${inputId}-popover`;
    const rootRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
      if (!open) return;
      const onDocClick = (e: MouseEvent) => {
        if (!rootRef.current) return;
        if (!rootRef.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    const handleCalChange = (next: CalendarValue) => {
      if (range) {
        if (next && !(next instanceof Date) && !Array.isArray(next))
          setValue(next);
        return;
      }
      if (next instanceof Date) {
        setValue(next);
        setOpen(false);
      } else if (next === null) {
        setValue(null);
      }
    };

    const text = formatValue(currentValue ?? null, showTime, format);

    return (
      <div ref={rootRef} className="ds-relative ds-inline-block">
        <input
          ref={ref}
          id={inputId}
          type="text"
          readOnly
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popId}
          value={text}
          placeholder={placeholder}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          className={cn(
            "ds-h-[var(--ds-spacing-9)] ds-px-[var(--ds-spacing-3)]",
            "ds-rounded-[var(--ds-radius-input)]",
            "ds-bg-[var(--ds-input-bg)] ds-text-[var(--ds-input-fg)]",
            "ds-border ds-border-solid ds-border-[var(--ds-input-border)]",
            "focus-visible:ds-outline focus-visible:ds-outline-2 focus-visible:ds-outline-[var(--ds-color-focus-ring)]",
            "ds-cursor-pointer ds-min-w-[var(--ds-spacing-48)]",
            className,
          )}
          {...rest}
        />
        {open ? (
          <div
            id={popId}
            role="dialog"
            aria-label="Choose a date"
            className="ds-absolute ds-z-[1000]"
            style={{
              top: "calc(var(--ds-spacing-9) + var(--ds-spacing-1))",
              left: 0,
            }}
          >
            <Calendar
              range={range}
              minDate={min}
              maxDate={max}
              value={
                currentValue instanceof Date
                  ? currentValue
                  : currentValue && !(currentValue instanceof Date)
                    ? currentValue
                    : null
              }
              onChange={handleCalChange}
            />
          </div>
        ) : null}
      </div>
    );
  },
);
