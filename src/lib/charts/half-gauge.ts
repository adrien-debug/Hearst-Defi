/**
 * Half-circle gauge dash math (path length 100, visible arc = 50).
 * Used by dashboard APY band and operational-confidence gauges.
 */

export interface HalfGaugeStroke {
  strokeDasharray: string;
  strokeDashoffset: number;
}

/** Highlight a value band [low, high] on axis 0…maxAxis (semicircle). */
export function halfGaugeRangeBand(
  low: number,
  high: number,
  maxAxis: number,
): HalfGaugeStroke {
  const lowPos = Math.max(0, Math.min(50, (1 - low / maxAxis) * 50));
  const highPos = Math.max(0, Math.min(50, (1 - high / maxAxis) * 50));
  const arc = Math.max(0.5, lowPos - highPos);
  return {
    strokeDasharray: `${arc} ${100 - arc}`,
    strokeDashoffset: -highPos,
  };
}

/** Single value 0…maxValue filled from the left of the semicircle. */
export function halfGaugeSingleValue(
  value: number,
  maxValue = 100,
): HalfGaugeStroke {
  const arc = Math.max(0, Math.min(50, (value / maxValue) * 50));
  return {
    strokeDasharray: `${arc} ${100 - arc}`,
    strokeDashoffset: -(50 - arc),
  };
}
