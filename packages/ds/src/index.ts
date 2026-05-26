/**
 * @ds/core — public barrel
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports policy
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * We deliberately do NOT re-export every primitive component here. Consumers
 * import primitives via their dedicated subpath:
 *
 *     import { Button } from "@ds/core/primitives/button";
 *
 * This guarantees tree-shaking even on bundlers that can't follow re-exports
 * (esbuild's metafile flagging "side-effects: true" on CSS imports for
 * instance), and keeps the public API surface small.
 *
 * What we DO re-export from the root entry:
 *
 *   • Utility helpers (cn, cva, compose-refs, slot, …) — pure functions, tiny.
 *   • Motion helpers (easings, presets, hooks) — small + framer-motion-aware.
 *   • The Tailwind preset (so consumer tailwind configs `import { dsPreset }`).
 *   • Theme-engine types — for typing themable contexts in apps.
 *
 * What we do NOT re-export:
 *
 *   • Token CSS files (consumed via `@ds/core/tokens` side-effect import).
 *   • Individual themes (consumed via `@ds/core/themes/<name>`).
 *   • Primitives (consumed via `@ds/core/primitives/<name>`).
 *
 * NOTE: `tokens.css` itself MUST be imported by the consumer at app boot:
 *
 *     // e.g. in `globals.css` or app root
 *     @import "@ds/core/tokens";
 *
 * Otherwise no CSS variables exist and components render unstyled.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ---------- Utilities (agent D's barrel) ----------------------------------- */
export * from "./utils";

/* ---------- Motion (agent C's barrel) -------------------------------------- */
export * from "./motion";

/* ---------- Tailwind preset (this file) ------------------------------------ */
export { dsPreset, default as default_tailwind_preset } from "./tailwind/preset";
export type { TailwindPresetConfig } from "./tailwind/preset";

/* ---------- Theme engine types (agent B owns the impl) --------------------- */
export type * from "./themes/theme-engine";
