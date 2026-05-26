/**
 * @ds/core — Framer Motion spring physics constants.
 *
 * Used by `presets.ts` (magneticHover, etc.) and consumable directly by app
 * code: `<motion.div transition={SPRINGS.stiff} />`.
 */

import type { Transition } from "framer-motion";

export const SPRINGS = {
  soft: {
    type: "spring",
    stiffness: 120,
    damping: 22,
    mass: 0.6,
  },
  base: {
    type: "spring",
    stiffness: 200,
    damping: 25,
    mass: 0.7,
  },
  stiff: {
    type: "spring",
    stiffness: 400,
    damping: 30,
    mass: 0.6,
  },
  bouncy: {
    type: "spring",
    stiffness: 300,
    damping: 15,
    mass: 0.8,
  },
  gentle: {
    type: "spring",
    stiffness: 80,
    damping: 18,
    mass: 1,
  },
} as const satisfies Record<string, Transition>;

export type SpringName = keyof typeof SPRINGS;
export type SpringConfig = (typeof SPRINGS)[SpringName];
