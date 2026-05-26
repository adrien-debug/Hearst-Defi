"use client";

import * as React from "react";

/**
 * Canonical breakpoint table. Values are in CSS pixels and mirror the
 * tokens emitted by Agent A (`--ds-bp-*`). Keep in sync.
 */
export const BREAKPOINTS = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
  "3xl": 1920,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

const BP_ORDER: readonly Breakpoint[] = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
];

function getBreakpoint(width: number): Breakpoint {
  let current: Breakpoint = "xs";
  for (const bp of BP_ORDER) {
    if (width >= BREAKPOINTS[bp]) {
      current = bp;
    }
  }
  return current;
}

/**
 * SSR-safe media-query hook. Returns `false` on the server, then the real
 * value after hydration (no layout shift if you guard with `useIsClient`).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (callback: () => void): (() => void) => {
      if (typeof window === "undefined") return () => undefined;
      const mql = window.matchMedia(query);
      // Some browsers (Safari ≤14) only support `addListener`.
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", callback);
        return () => mql.removeEventListener("change", callback);
      }
      mql.addListener(callback);
      return () => mql.removeListener(callback);
    },
    [query],
  );

  const getSnapshot = React.useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = React.useCallback((): boolean => false, []);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * SSR-safe viewport-breakpoint hook. Returns `"xs"` on the server.
 */
export function useBreakpoint(): Breakpoint {
  const subscribe = React.useCallback((callback: () => void) => {
    if (typeof window === "undefined") return () => undefined;
    window.addEventListener("resize", callback, { passive: true });
    return () => window.removeEventListener("resize", callback);
  }, []);

  const getSnapshot = React.useCallback((): Breakpoint => {
    if (typeof window === "undefined") return "xs";
    return getBreakpoint(window.innerWidth);
  }, []);

  const getServerSnapshot = React.useCallback((): Breakpoint => "xs", []);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * SSR-safe container-query hook. Observes the ref'd element via
 * `ResizeObserver` and re-evaluates the predicate on each resize.
 *
 * @param ref     ref to the container element
 * @param query   CSS @container expression-style string, e.g. `(min-width: 480px)`
 */
export function useContainerQuery(
  ref: React.RefObject<HTMLElement | null>,
  query: string,
): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const matcher = parseContainerQuery(query);
    if (!matcher) return;

    const evaluate = (): void => {
      const rect = node.getBoundingClientRect();
      setMatches(matcher({ width: rect.width, height: rect.height }));
    };

    const observer = new ResizeObserver(evaluate);
    observer.observe(node);
    evaluate();

    return () => observer.disconnect();
  }, [ref, query]);

  return matches;
}

type ContainerSize = { width: number; height: number };
type ContainerMatcher = (size: ContainerSize) => boolean;

/**
 * Parses a single-expression container query like
 * `(min-width: 480px)` or `(max-height: 600px)`.
 * Returns `null` for unsupported syntax (callers default to `false`).
 */
function parseContainerQuery(query: string): ContainerMatcher | null {
  const match = query
    .trim()
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .match(/^(min|max)-(width|height)\s*:\s*(\d+(?:\.\d+)?)px$/i);
  if (!match) return null;
  const [, bound, axis, raw] = match;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;

  return (size) => {
    const dim = axis === "width" ? size.width : size.height;
    return bound === "min" ? dim >= value : dim <= value;
  };
}

/**
 * Convenience hook: `true` once the component is mounted on the client.
 * Use to gate any window-dependent render that you can't ship from SSR.
 */
export function useIsClient(): boolean {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}
