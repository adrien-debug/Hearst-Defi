/**
 * Donut segment builder — DESIGN_SYSTEM §5 (C ≈ 100, dasharray = `${pct} ${100-pct}`).
 */

export interface DonutSegment {
  pct: number;
  dashArray: string;
  dashOffset: number;
}

/** Build stroke-dash segments for a donut where each item carries a percent (0–100). */
export function buildDonutSegments(
  items: ReadonlyArray<{ pct: number }>,
): DonutSegment[] {
  let cumulative = 0;
  const segments: DonutSegment[] = [];
  for (const item of items) {
    const dashArray = `${item.pct} ${100 - item.pct}`;
    const dashOffset = cumulative === 0 ? 0 : -cumulative;
    segments.push({ pct: item.pct, dashArray, dashOffset });
    cumulative += item.pct;
  }
  return segments;
}
