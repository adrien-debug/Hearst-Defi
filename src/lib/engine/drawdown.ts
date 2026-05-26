/**
 * drawdown.ts — pure engine utility.
 *
 * Identifies contiguous periods where a NAV series is below its running
 * maximum (i.e. drawdown periods) and computes the depth of each.
 *
 * Constraints (CLAUDE.md engine purity):
 *   - No I/O, no Date.now(), no Math.random(), no fetch, no process.env
 *   - No imports from src/app or src/components
 *   - No `any`, no `as unknown as`
 */

export interface NavPoint {
  /** ISO date string, e.g. "2026-01-15" */
  date: string;
  aum_usdc: number;
}

export interface DrawdownPeriod {
  /** Inclusive start index in the input series */
  start: number;
  /** Inclusive end index in the input series */
  end: number;
  /**
   * Maximum drawdown depth within this period as a positive fraction
   * (e.g. 0.08 = 8% below running max). Always >= 0.
   */
  depth: number;
}

/**
 * Compute contiguous drawdown periods from a NAV series.
 *
 * A drawdown period begins when `aum_usdc` falls below the running maximum
 * seen so far and ends when the series recovers to or above that maximum
 * (or the series ends while still in drawdown).
 *
 * @param navSeries  Ordered array of NAV points (oldest → newest).
 * @returns          Array of non-overlapping drawdown periods. Empty when
 *                   the series is monotonically non-decreasing or has < 2 points.
 */
export function computeDrawdownPeriods(
  navSeries: ReadonlyArray<NavPoint>,
): DrawdownPeriod[] {
  if (navSeries.length < 2) return [];

  const periods: DrawdownPeriod[] = [];

  let runningMax = navSeries[0]!.aum_usdc;
  let inDrawdown = false;
  let ddStart = 0;
  let maxDepth = 0;

  for (let i = 1; i < navSeries.length; i++) {
    const value = navSeries[i]!.aum_usdc;

    if (value < runningMax) {
      // Entering or continuing a drawdown period
      if (!inDrawdown) {
        inDrawdown = true;
        ddStart = i - 1; // period starts at the last peak index
        maxDepth = 0;
      }
      const depth = (runningMax - value) / runningMax;
      if (depth > maxDepth) maxDepth = depth;
    } else {
      // At or above running max — close any open drawdown period
      if (inDrawdown) {
        periods.push({ start: ddStart, end: i - 1, depth: maxDepth });
        inDrawdown = false;
        maxDepth = 0;
      }
      // Update running max
      if (value > runningMax) runningMax = value;
    }
  }

  // Close any period still open at end of series
  if (inDrawdown) {
    periods.push({
      start: ddStart,
      end: navSeries.length - 1,
      depth: maxDepth,
    });
  }

  return periods;
}
