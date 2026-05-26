/**
 * @ds/core — Framer Motion variant presets.
 *
 * All durations & easings reference `easings.ts` / `springs.ts`. No magic
 * numbers below. Each preset is `Variants`-shaped (with `initial`, `animate`,
 * `exit` keys) so consumers can plug into `<motion.div variants={…}>` or
 * directly spread on a single component.
 */

import type { Transition, Variants } from "framer-motion";

import { DURATIONS, EASINGS, ms } from "./easings";
import { SPRINGS } from "./springs";

/* -------------------------------------------------------------------------- */
/*  Shared transitions                                                         */
/* -------------------------------------------------------------------------- */

const tBase: Transition = { duration: ms("base"), ease: EASINGS.out };
const tSm: Transition = { duration: ms("sm"), ease: EASINGS.out };
const tMd: Transition = { duration: ms("md"), ease: EASINGS.emphasized };
const tLg: Transition = { duration: ms("lg"), ease: EASINGS.emphasized };
const tExit: Transition = { duration: ms("base"), ease: EASINGS.accelerate };

/* -------------------------------------------------------------------------- */
/*  Fades                                                                      */
/* -------------------------------------------------------------------------- */

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: tBase },
  exit: { opacity: 0, transition: tExit },
} as const satisfies Variants;

/* -------------------------------------------------------------------------- */
/*  Slides                                                                     */
/* -------------------------------------------------------------------------- */

const SLIDE_DISTANCE = 16; // px — kept here as the only motion-distance const

export const slideUp = {
  initial: { opacity: 0, y: SLIDE_DISTANCE },
  animate: { opacity: 1, y: 0, transition: tMd },
  exit: { opacity: 0, y: SLIDE_DISTANCE, transition: tExit },
} as const satisfies Variants;

export const slideDown = {
  initial: { opacity: 0, y: -SLIDE_DISTANCE },
  animate: { opacity: 1, y: 0, transition: tMd },
  exit: { opacity: 0, y: -SLIDE_DISTANCE, transition: tExit },
} as const satisfies Variants;

export const slideLeft = {
  initial: { opacity: 0, x: SLIDE_DISTANCE },
  animate: { opacity: 1, x: 0, transition: tMd },
  exit: { opacity: 0, x: SLIDE_DISTANCE, transition: tExit },
} as const satisfies Variants;

export const slideRight = {
  initial: { opacity: 0, x: -SLIDE_DISTANCE },
  animate: { opacity: 1, x: 0, transition: tMd },
  exit: { opacity: 0, x: -SLIDE_DISTANCE, transition: tExit },
} as const satisfies Variants;

/* -------------------------------------------------------------------------- */
/*  Scales                                                                     */
/* -------------------------------------------------------------------------- */

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: tBase },
  exit: { opacity: 0, scale: 0.96, transition: tExit },
} as const satisfies Variants;

export const scaleOut = {
  initial: { opacity: 0, scale: 1.04 },
  animate: { opacity: 1, scale: 1, transition: tBase },
  exit: { opacity: 0, scale: 1.04, transition: tExit },
} as const satisfies Variants;

/* -------------------------------------------------------------------------- */
/*  Dialog / modal                                                             */
/* -------------------------------------------------------------------------- */

export const dialogEnter = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: ms("md"), ease: EASINGS.emphasized },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: ms("base"), ease: EASINGS.accelerate },
  },
} as const satisfies Variants;

export const dialogExit = {
  initial: { opacity: 1, scale: 1, y: 0 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: ms("base"), ease: EASINGS.accelerate },
  },
} as const satisfies Variants;

/* -------------------------------------------------------------------------- */
/*  Drawer / sheet                                                             */
/* -------------------------------------------------------------------------- */

export const drawerEnterLeft = {
  initial: { x: "-100%" },
  animate: { x: 0, transition: tLg },
  exit: { x: "-100%", transition: tExit },
} as const satisfies Variants;

export const drawerEnterRight = {
  initial: { x: "100%" },
  animate: { x: 0, transition: tLg },
  exit: { x: "100%", transition: tExit },
} as const satisfies Variants;

/* -------------------------------------------------------------------------- */
/*  Toast                                                                      */
/* -------------------------------------------------------------------------- */

export const toastEnter = {
  initial: { opacity: 0, y: 24, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: ms("base"), ease: EASINGS.decelerate },
  },
  exit: { opacity: 0, y: 24, scale: 0.94, transition: tExit },
} as const satisfies Variants;

export const toastExit = {
  initial: { opacity: 1, y: 0, scale: 1 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 24, scale: 0.94, transition: tExit },
} as const satisfies Variants;

/* -------------------------------------------------------------------------- */
/*  Tooltip                                                                    */
/* -------------------------------------------------------------------------- */

export const tooltipEnter = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: tSm },
  exit: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: ms("xs"), ease: EASINGS.accelerate },
  },
} as const satisfies Variants;

export const tooltipExit = {
  initial: { opacity: 1, scale: 1 },
  animate: { opacity: 1, scale: 1 },
  exit: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: ms("xs"), ease: EASINGS.accelerate },
  },
} as const satisfies Variants;

/* -------------------------------------------------------------------------- */
/*  Popover                                                                    */
/* -------------------------------------------------------------------------- */

export const popoverEnter = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: ms("base"), ease: EASINGS.out },
  },
  exit: { opacity: 0, scale: 0.96, y: -4, transition: tExit },
} as const satisfies Variants;

export const popoverExit = {
  initial: { opacity: 1, scale: 1, y: 0 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -4, transition: tExit },
} as const satisfies Variants;

/* -------------------------------------------------------------------------- */
/*  Stagger containers                                                         */
/* -------------------------------------------------------------------------- */

export const staggerChildren = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: DURATIONS.sm / 1000 * 0.6, // 60ms
      delayChildren: DURATIONS.xs / 1000,
    },
  },
  exit: {
    transition: {
      staggerChildren: DURATIONS.xs / 1000 * 0.6, // 30ms
      staggerDirection: -1,
    },
  },
} as const satisfies Variants;

export const staggerChildrenFast = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: DURATIONS.xs / 1000 * 0.6, // 30ms
      delayChildren: 0,
    },
  },
  exit: {
    transition: {
      staggerChildren: DURATIONS.xs / 1000 * 0.4, // 20ms
      staggerDirection: -1,
    },
  },
} as const satisfies Variants;

export const staggerChildrenSlow = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: DURATIONS.sm / 1000 * 1.2, // 120ms
      delayChildren: DURATIONS.sm / 1000,
    },
  },
  exit: {
    transition: {
      staggerChildren: DURATIONS.sm / 1000 * 0.6, // 60ms
      staggerDirection: -1,
    },
  },
} as const satisfies Variants;

/* -------------------------------------------------------------------------- */
/*  Press / hover micro-interactions                                           */
/* -------------------------------------------------------------------------- */

/** Spring stiff — use as `transition` on hover-tracking elements. */
export const magneticHover: Transition = SPRINGS.stiff;

export const pressShrink = {
  initial: { scale: 1 },
  animate: { scale: 1 },
  exit: { scale: 1 },
  whileTap: { scale: 0.97, transition: SPRINGS.stiff },
  whileHover: { scale: 1.02, transition: SPRINGS.soft },
} as const satisfies Variants;

/* -------------------------------------------------------------------------- */
/*  Pages (route transitions)                                                  */
/* -------------------------------------------------------------------------- */

export const pageEnter = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: ms("lg"), ease: EASINGS.emphasized },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: ms("md"), ease: EASINGS.accelerate },
  },
} as const satisfies Variants;

export const pageExit = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: ms("md"), ease: EASINGS.accelerate },
  },
} as const satisfies Variants;
