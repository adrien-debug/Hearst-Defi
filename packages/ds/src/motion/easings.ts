/**
 * @ds/core — Easings & durations (TS exports for Framer Motion)
 *
 * Source of truth for animation easings used in `presets.ts`. CSS counterparts
 * live in `tokens.css` (--ds-motion-ease-*). Keep both in sync if you tweak.
 */

export const EASINGS = {
  linear: "linear",
  out: "cubic-bezier(0.16, 1, 0.3, 1)", // Material standard easing
  in: "cubic-bezier(0.7, 0, 0.84, 0)",
  inOut: "cubic-bezier(0.83, 0, 0.17, 1)",
  emphasized: "cubic-bezier(0.2, 0, 0, 1)", // Apple-style
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // overshoot léger
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  decelerate: "cubic-bezier(0, 0, 0.2, 1)",
  accelerate: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

export type EasingName = keyof typeof EASINGS;
export type EasingValue = (typeof EASINGS)[EasingName];

/**
 * Cubic-bezier control points (Framer Motion accepts `ease: number[]` of
 * length 4 for path-driven easings — useful when bezier strings choke).
 */
export const EASING_POINTS = {
  linear: [0, 0, 1, 1],
  out: [0.16, 1, 0.3, 1],
  in: [0.7, 0, 0.84, 0],
  inOut: [0.83, 0, 0.17, 1],
  emphasized: [0.2, 0, 0, 1],
  spring: [0.34, 1.56, 0.64, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
} as const satisfies Record<EasingName, readonly [number, number, number, number]>;

/**
 * Durations in milliseconds. Framer Motion uses seconds for `duration`
 * inside `transition`, so consumers should divide by 1000 when feeding
 * a `Transition` object (see `presets.ts`).
 */
export const DURATIONS = {
  instant: 0,
  xs: 50,
  sm: 100,
  base: 200,
  md: 300,
  lg: 500,
  xl: 700,
  "2xl": 1000,
} as const;

export type DurationName = keyof typeof DURATIONS;
export type DurationValue = (typeof DURATIONS)[DurationName];

/** Helper: convert a duration token from ms to seconds (Framer Motion API). */
export const ms = (name: DurationName): number => DURATIONS[name] / 1000;
