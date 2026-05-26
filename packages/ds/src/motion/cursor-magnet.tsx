/**
 * @ds/core — `<MagneticArea>` + `useCursorMagnet`
 *
 * Cursor-tracking magnetic hover effect à la Stripe / Vercel landing pages.
 * Translates the wrapped element up to `strength * 100%` of the distance
 * between the cursor and the element center, with a stiff spring for
 * snappiness. Disabled automatically when `prefers-reduced-motion: reduce`.
 */

"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { HTMLAttributes, MouseEvent as ReactMouseEvent } from "react";
import { motion, useMotionValue, useSpring, type MotionValue } from "framer-motion";

import { SPRINGS } from "./springs";
import { useReducedMotion } from "./useReducedMotion";

/* -------------------------------------------------------------------------- */
/*  Hook                                                                       */
/* -------------------------------------------------------------------------- */

export interface UseCursorMagnetOptions {
  /** Max translation as a fraction of element half-size. Default 0.1 (10%). */
  strength?: number;
}

export interface UseCursorMagnetReturn {
  x: MotionValue<number>;
  y: MotionValue<number>;
  onMouseMove: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
}

export function useCursorMagnet(
  options: UseCursorMagnetOptions = {},
): UseCursorMagnetReturn {
  const { strength = 0.1 } = options;
  const reduced = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRINGS.stiff);
  const y = useSpring(rawY, SPRINGS.stiff);

  const onMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLElement>): void => {
      if (reduced) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (event.clientX - cx) * strength;
      const dy = (event.clientY - cy) * strength;
      rawX.set(dx);
      rawY.set(dy);
    },
    [rawX, rawY, reduced, strength],
  );

  const onMouseLeave = useCallback((): void => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  // Make sure values reset if the user toggles reduced-motion mid-session.
  useEffect(() => {
    if (reduced) {
      rawX.set(0);
      rawY.set(0);
    }
  }, [reduced, rawX, rawY]);

  return { x, y, onMouseMove, onMouseLeave };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Drag handlers are deliberately omitted from the public prop type — framer-motion's
 * `HTMLMotionProps<"div">` defines its own `onDrag*` family (PanInfo signature) that
 * conflicts with React's native `DragEventHandler`. Callers who need drag should drop
 * down to `motion.div` directly.
 */
export interface MagneticAreaProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "onDrag" | "onDragEnd" | "onDragStart" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
  > {
  /** Max translation as a fraction of distance. Default 0.1 (10%). */
  strength?: number;
}

export const MagneticArea = forwardRef<HTMLDivElement, MagneticAreaProps>(
  function MagneticArea(
    { strength = 0.1, children, onMouseMove, onMouseLeave, style, ...rest },
    ref,
  ) {
    const innerRef = useRef<HTMLDivElement | null>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

    const { x, y, onMouseMove: trackMove, onMouseLeave: trackLeave } =
      useCursorMagnet({ strength });

    const handleMove = (event: ReactMouseEvent<HTMLDivElement>): void => {
      trackMove(event);
      onMouseMove?.(event);
    };

    const handleLeave = (event: ReactMouseEvent<HTMLDivElement>): void => {
      trackLeave();
      onMouseLeave?.(event);
    };

    return (
      <motion.div
        ref={innerRef}
        style={{ x, y, display: "inline-block", ...style }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
