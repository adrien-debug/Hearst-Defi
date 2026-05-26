import type * as React from "react";

import type { CalendarRange } from "../calendar/calendar.types";

export interface DatePickerProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "min" | "max"
  > {
  value?: Date | CalendarRange | null;
  defaultValue?: Date | CalendarRange | null;
  onChange?: (value: Date | CalendarRange | null) => void;
  /** Format function. Default formats YYYY-MM-DD. */
  format?: (value: Date) => string;
  min?: Date;
  max?: Date;
  showTime?: boolean;
  range?: boolean;
  placeholder?: string;
}
