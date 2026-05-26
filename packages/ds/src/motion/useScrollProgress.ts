/**
 * @ds/core — `useScrollProgress`
 *
 * Returns a Framer `MotionValue<number>` between 0 and 1 representing the
 * scroll progress of the referenced element (or the window if no ref is
 * passed). Use to drive parallax, progress bars, header collapse, etc.
 *
 * SSR-safe — falls back to a static motion value on the server.
 */

"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

function computeProgress(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
): number {
  const max = scrollHeight - clientHeight;
  if (max <= 0) return 0;
  const ratio = scrollTop / max;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

export function useScrollProgress(
  ref?: RefObject<HTMLElement | null>,
): MotionValue<number> {
  const progress = useMotionValue<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const target: HTMLElement | Window = ref?.current ?? window;

    const read = (): void => {
      if (target === window) {
        const doc = document.documentElement;
        progress.set(
          computeProgress(window.scrollY, window.innerHeight, doc.scrollHeight),
        );
        return;
      }
      const el = target as HTMLElement;
      progress.set(computeProgress(el.scrollTop, el.clientHeight, el.scrollHeight));
    };

    read();

    const opts: AddEventListenerOptions = { passive: true };
    target.addEventListener("scroll", read, opts);
    window.addEventListener("resize", read, opts);

    return () => {
      target.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [ref, progress]);

  return progress;
}
