"use client";

import * as React from "react";

/**
 * Stable, SSR-safe id generator.
 *
 * Wraps React 18's `useId()` and optionally prefixes it (so that ARIA
 * `aria-labelledby` / `aria-controls` pairs are easy to spot in DevTools).
 *
 * @example
 * const inputId = useId("input");      // → "input-:r5:"
 * const helpId = useId("input-help");
 */
export function useId(prefix?: string): string {
  const rid = React.useId();
  return prefix ? `${prefix}-${rid}` : rid;
}
