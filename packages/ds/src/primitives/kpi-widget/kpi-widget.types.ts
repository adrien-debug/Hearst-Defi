import type { HTMLAttributes, ReactNode } from "react";

import type { KpiWidgetVariantProps } from "./kpi-widget.variants";

export type KpiWidgetVariant = NonNullable<KpiWidgetVariantProps["variant"]>;
export type KpiWidgetSize = NonNullable<KpiWidgetVariantProps["size"]>;
export type KpiProvenance = "live" | "estimated" | "stale";
export type KpiDeltaDirection = "up" | "down" | "flat";

export interface KpiDelta {
  /** Numeric value (use sign matching `direction`). */
  value: number;
  /** Trend direction. */
  direction: KpiDeltaDirection;
  /** Optional override for the formatted label (e.g. `"+2.4 %"`). */
  label?: string;
}

export interface KpiWidgetProps
  extends HTMLAttributes<HTMLDivElement>,
    KpiWidgetVariantProps {
  /** Short label (e.g. "TVL"). */
  label: string;
  /** Primary value. */
  value: ReactNode;
  /** Optional unit suffix (e.g. "USDC", "%"). */
  unit?: string;
  /** Optional delta block. */
  delta?: KpiDelta;
  /** Sparkline data (≥2 points). Rendered as inline SVG, no lib. */
  sparkline?: number[];
  /** Optional provenance pill. */
  provenance?: KpiProvenance;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Optional footnote line. */
  caption?: ReactNode;
}
