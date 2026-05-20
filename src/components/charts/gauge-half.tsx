import {
  halfGaugeRangeBand,
  halfGaugeSingleValue,
} from "@/lib/charts/half-gauge";
import { cn } from "@/lib/cn";

type HalfGaugeBaseProps = {
  className?: string;
  /** SVG width/height in px (square). */
  size?: number;
  strokeWidth?: number;
  centerPrimary: React.ReactNode;
  centerSecondary?: React.ReactNode;
  footer?: React.ReactNode;
};

type HalfGaugeRangeProps = HalfGaugeBaseProps & {
  mode: "range";
  low: number;
  high: number;
  maxAxis: number;
};

type HalfGaugeValueProps = HalfGaugeBaseProps & {
  mode: "value";
  value: number;
  maxValue?: number;
};

export type HalfGaugeProps = HalfGaugeRangeProps | HalfGaugeValueProps;

export function HalfGauge(props: HalfGaugeProps) {
  const {
    className,
    size = 160,
    strokeWidth = 6,
    centerPrimary,
    centerSecondary,
    footer,
  } = props;

  const stroke =
    props.mode === "range"
      ? halfGaugeRangeBand(props.low, props.high, props.maxAxis)
      : halfGaugeSingleValue(props.value, props.maxValue ?? 100);

  return (
    <div className={cn("gauge-container", className)}>
      <svg
        className="gauge-svg"
        viewBox="0 0 42 42"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <circle
          className="gauge-svg-circle bg"
          cx="21"
          cy="21"
          r="15.9155"
          strokeWidth={strokeWidth}
          strokeDasharray="50 50"
        />
        <circle
          className="gauge-svg-circle fg"
          cx="21"
          cy="21"
          r="15.9155"
          strokeWidth={strokeWidth}
          strokeDasharray={stroke.strokeDasharray}
          strokeDashoffset={stroke.strokeDashoffset}
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-val">{centerPrimary}</span>
        {centerSecondary ? (
          <span className="gauge-lbl">{centerSecondary}</span>
        ) : null}
      </div>
      {footer ? <div className="gauge-range">{footer}</div> : null}
    </div>
  );
}
