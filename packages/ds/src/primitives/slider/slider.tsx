"use client";

/**
 * @ds/core/primitives/slider
 *
 * Token-styled wrapper over `@radix-ui/react-slider`. Single-thumb or range
 * (`dualThumb`), optional marks, optional value tooltip with custom formatter.
 */

import * as RxSlider from "@radix-ui/react-slider";
import { forwardRef, useMemo, useState } from "react";
import type { ForwardedRef } from "react";

import { cn } from "../../utils/cn";
import { useId } from "../../utils/id";

import {
  sliderRangeVariants,
  sliderRootVariants,
  sliderThumbVariants,
  sliderTrackVariants,
} from "./slider.variants";
import type { SliderProps } from "./slider.types";

function toArray(v: number | readonly [number, number] | undefined): number[] | undefined {
  if (v === undefined) return undefined;
  return typeof v === "number" ? [v] : [v[0], v[1]];
}

export const Slider = forwardRef<HTMLSpanElement, SliderProps>(function Slider(
  {
    min,
    max,
    step = 1,
    value,
    defaultValue,
    onChange,
    onCommit,
    dualThumb = false,
    marks,
    showTooltip = false,
    formatValue,
    variant,
    label,
    description,
    disabled,
    name,
    id,
    className,
    ariaLabel,
  }: SliderProps,
  ref: ForwardedRef<HTMLSpanElement>,
) {
  const reactId = useId("ds-slider");
  const sId = id ?? reactId;
  const descId = description ? `${sId}-desc` : undefined;

  const fallbackDefault = useMemo<number[]>(
    () => (dualThumb ? [min, max] : [min]),
    [dualThumb, min, max],
  );

  const arrValue = toArray(value);
  const arrDefault = toArray(defaultValue) ?? fallbackDefault;
  const [hoverThumb, setHoverThumb] = useState<number | null>(null);

  const handleValueChange = (next: number[]) => {
    if (!onChange) return;
    if (dualThumb && next.length >= 2) {
      onChange([next[0]!, next[1]!] as const);
    } else if (next.length >= 1) {
      onChange(next[0]!);
    }
  };

  const handleValueCommit = (next: number[]) => {
    if (!onCommit) return;
    if (dualThumb && next.length >= 2) {
      onCommit([next[0]!, next[1]!] as const);
    } else if (next.length >= 1) {
      onCommit(next[0]!);
    }
  };

  const formatter = formatValue ?? ((n: number) => String(n));
  const thumbCount = dualThumb ? 2 : 1;

  return (
    <div className={cn("flex w-full flex-col gap-[var(--ds-spacing-2)]", className)}>
      {label ? (
        <label
          htmlFor={sId}
          className={cn(
            "text-[length:var(--ds-font-size-body-sm)]",
            "font-[var(--ds-font-weight-body-md,500)]",
            "text-[color:var(--ds-text-primary)]",
          )}
        >
          {label}
        </label>
      ) : null}

      <RxSlider.Root
        ref={ref}
        id={sId}
        min={min}
        max={max}
        step={step}
        value={arrValue}
        defaultValue={arrDefault}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        disabled={disabled}
        name={name}
        aria-describedby={descId}
        aria-label={ariaLabel}
        className={sliderRootVariants()}
      >
        <RxSlider.Track className={sliderTrackVariants()}>
          <RxSlider.Range className={sliderRangeVariants({ variant })} />
        </RxSlider.Track>

        {Array.from({ length: thumbCount }, (_, i) => (
          <RxSlider.Thumb
            key={i}
            onPointerEnter={() => setHoverThumb(i)}
            onPointerLeave={() => setHoverThumb(null)}
            onFocus={() => setHoverThumb(i)}
            onBlur={() => setHoverThumb(null)}
            className={cn(sliderThumbVariants(), "relative")}
            aria-label={
              ariaLabel
                ? `${ariaLabel}${dualThumb ? (i === 0 ? " (lower)" : " (upper)") : ""}`
                : undefined
            }
          >
            {showTooltip && hoverThumb === i ? (
              <span
                role="status"
                aria-live="polite"
                className={cn(
                  "absolute -top-[28px] left-1/2 -translate-x-1/2",
                  "rounded-[var(--ds-radius-sm)]",
                  "bg-[color:var(--ds-surface-overlay,var(--ds-surface-raised))]",
                  "px-[var(--ds-spacing-1_5)] py-[var(--ds-spacing-0_5)]",
                  "text-[length:var(--ds-font-size-body-xs)]",
                  "text-[color:var(--ds-text-primary)]",
                  "shadow-[var(--ds-shadow-floating,0_4px_12px_rgba(0,0,0,0.2))]",
                  "whitespace-nowrap pointer-events-none",
                )}
              >
                {formatter(
                  (arrValue ?? arrDefault)[i] ??
                    (i === 0 ? min : max),
                )}
              </span>
            ) : null}
          </RxSlider.Thumb>
        ))}
      </RxSlider.Root>

      {marks && marks.length > 0 ? (
        <div
          aria-hidden="true"
          className={cn(
            "relative mt-[var(--ds-spacing-1)] h-[var(--ds-spacing-4)] w-full",
          )}
        >
          {marks.map((mark) => {
            const pct = ((mark.value - min) / (max - min)) * 100;
            return (
              <span
                key={mark.value}
                style={{ left: `${pct}%` }}
                className={cn(
                  "absolute top-0 -translate-x-1/2",
                  "text-[length:var(--ds-font-size-body-xs)]",
                  "text-[color:var(--ds-text-muted)]",
                  "whitespace-nowrap",
                )}
              >
                {mark.label ?? mark.value}
              </span>
            );
          })}
        </div>
      ) : null}

      {description ? (
        <p
          id={descId}
          className={cn(
            "text-[length:var(--ds-font-size-body-sm)]",
            "text-[color:var(--ds-text-muted)]",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
});

Slider.displayName = "Slider";
