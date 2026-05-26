import type { ReactNode } from "react";

import type { SliderRangeVariantProps } from "./slider.variants";

export type SliderVariant = NonNullable<SliderRangeVariantProps["variant"]>;

export interface SliderMark {
  value: number;
  label?: ReactNode;
}

export interface SliderProps extends Pick<SliderRangeVariantProps, "variant"> {
  min: number;
  max: number;
  step?: number;
  /** Controlled value. Number for single, [low, high] for `dualThumb`. */
  value?: number | readonly [number, number];
  defaultValue?: number | readonly [number, number];
  onChange?: (value: number | readonly [number, number]) => void;
  /** Optional commit handler (fires on pointer up). */
  onCommit?: (value: number | readonly [number, number]) => void;
  /** Range mode: render two thumbs and emit a tuple. */
  dualThumb?: boolean;
  /** Marks rendered under the track. */
  marks?: ReadonlyArray<SliderMark>;
  /** Floating tooltip with formatted value above the active thumb. */
  showTooltip?: boolean;
  formatValue?: (value: number) => string;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
}
