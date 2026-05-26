"use client";

/**
 * @ds/core/primitives/kpi-widget
 *
 * Atomic KPI card — label, value, delta, sparkline, provenance.
 * SVG-only sparkline (no chart dep).
 */

import { forwardRef, useId, useMemo } from "react";
import type { ForwardedRef } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { cn } from "../../utils/cn";

import { kpiWidgetVariants } from "./kpi-widget.variants";
import type {
  KpiDelta,
  KpiDeltaDirection,
  KpiWidgetProps,
} from "./kpi-widget.types";

const SPARK_W = 96;
const SPARK_H = 24;
const SPARK_PAD = 1;

function buildSparkPath(points: readonly number[]): string {
  if (points.length < 2) return "";
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  const range = max - min || 1;
  const stepX = (SPARK_W - SPARK_PAD * 2) / (points.length - 1);
  const segments: string[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const v = points[i] ?? 0;
    const x = SPARK_PAD + i * stepX;
    const y =
      SPARK_PAD + (SPARK_H - SPARK_PAD * 2) * (1 - (v - min) / range);
    segments.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return segments.join(" ");
}

function arrowFor(dir: KpiDeltaDirection): typeof ArrowUpRight {
  if (dir === "up") return ArrowUpRight;
  if (dir === "down") return ArrowDownRight;
  return ArrowRight;
}

function defaultDeltaLabel(d: KpiDelta): string {
  const sign = d.direction === "up" ? "+" : d.direction === "down" ? "−" : "";
  return `${sign}${Math.abs(d.value)}`;
}

export const KpiWidget = forwardRef<HTMLDivElement, KpiWidgetProps>(
  function KpiWidget(
    {
      label,
      value,
      unit,
      delta,
      sparkline,
      provenance,
      icon,
      caption,
      variant,
      size,
      className,
      ...rest
    }: KpiWidgetProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const styles = kpiWidgetVariants({ variant, size });
    const titleId = useId();
    const path = useMemo(
      () => (sparkline ? buildSparkPath(sparkline) : ""),
      [sparkline],
    );

    const DeltaArrow = delta ? arrowFor(delta.direction) : null;

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        className={cn(styles.root(), className)}
        {...rest}
      >
        <div className={styles.header()}>
          {icon ? (
            <span aria-hidden="true" className={styles.icon()}>
              {icon}
            </span>
          ) : null}
          <span id={titleId} className={styles.label()}>
            {label}
          </span>
          {provenance ? (
            <span
              className={styles.provenance()}
              data-prov={provenance}
              aria-label={`Provenance ${provenance}`}
            >
              {provenance}
            </span>
          ) : null}
        </div>

        <div className={styles.valueRow()}>
          <span className={styles.value()}>{value}</span>
          {unit ? <span className={styles.unit()}>{unit}</span> : null}
        </div>

        {(delta || sparkline) ? (
          <div className={styles.deltaRow()}>
            {delta && DeltaArrow ? (
              <span
                className={styles.delta()}
                data-dir={delta.direction}
                aria-label={`Delta ${delta.direction}`}
              >
                <DeltaArrow aria-hidden="true" size={12} />
                <span>{delta.label ?? defaultDeltaLabel(delta)}</span>
              </span>
            ) : null}
            {sparkline && sparkline.length >= 2 ? (
              <svg
                role="img"
                aria-label="Trend sparkline"
                viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
                preserveAspectRatio="none"
                className={styles.sparkline()}
                width="100%"
                height={SPARK_H}
              >
                <path
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "text-[color:var(--ds-text-secondary)]",
                    delta?.direction === "up" &&
                      "text-[color:var(--ds-status-success-fg,var(--ds-color-success-600))]",
                    delta?.direction === "down" &&
                      "text-[color:var(--ds-status-danger-fg,var(--ds-color-danger-600))]",
                  )}
                />
              </svg>
            ) : null}
          </div>
        ) : null}

        {caption ? <div className={styles.caption()}>{caption}</div> : null}
      </div>
    );
  },
);

KpiWidget.displayName = "KpiWidget";
