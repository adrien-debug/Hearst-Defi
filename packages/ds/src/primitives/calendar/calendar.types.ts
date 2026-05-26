import type * as React from "react";

export type CalendarVariant = "default" | "compact";

export interface CalendarRange {
  from: Date | null;
  to: Date | null;
}

export type CalendarValue = Date | Date[] | CalendarRange | null;

export interface CalendarProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "onChange" | "defaultValue"
  > {
  value?: CalendarValue;
  defaultValue?: CalendarValue;
  onChange?: (value: CalendarValue) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: (date: Date) => boolean;
  /** Select multiple individual dates (toggle). */
  multi?: boolean;
  /** Select a contiguous range. */
  range?: boolean;
  variant?: CalendarVariant;
  /** Initial view month. */
  defaultMonth?: Date;
  /** Locale used for month/day labels (defaults to "en-US"). */
  locale?: string;
}
