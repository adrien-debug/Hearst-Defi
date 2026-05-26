/**
 * @ds/core — `useReducedMotion`
 *
 * Reactive hook that mirrors the user's OS `prefers-reduced-motion` setting.
 * SSR-safe: returns `false` on the server, then updates on the client.
 *
 * Prefer this over importing Framer's own `useReducedMotion` so that all
 * primitives go through a single, instrumentable hook.
 */

"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getInitial(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(getInitial);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mql: MediaQueryList = window.matchMedia(QUERY);
    setReduced(mql.matches);

    const onChange = (event: MediaQueryListEvent): void => {
      setReduced(event.matches);
    };

    // Newer browsers expose `addEventListener` on MediaQueryList ; older
    // Safari (<14) only has `addListener`. Cover both for portability.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => {
        mql.removeEventListener("change", onChange);
      };
    }

    type LegacyMql = MediaQueryList & {
      addListener: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    const legacy = mql as LegacyMql;
    legacy.addListener(onChange);
    return () => {
      legacy.removeListener(onChange);
    };
  }, []);

  return reduced;
}
