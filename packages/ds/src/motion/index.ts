/**
 * @ds/core/motion — public barrel.
 *
 * CSS tokens (tokens.css) are not re-exported here ; consumers import
 * `@ds/core/motion/tokens.css` (or the global token bundle) explicitly to
 * register the custom properties on `:root`.
 */

export * from "./easings";
export * from "./springs";
export * from "./presets";
export * from "./useReducedMotion";
export * from "./useScrollProgress";
export * from "./cursor-magnet";
