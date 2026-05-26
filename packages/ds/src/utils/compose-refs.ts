"use client";

import * as React from "react";

type PossibleRef<T> = React.Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, value: T): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    // React.MutableRefObject — we deliberately mutate `current` here.
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

/**
 * Compose multiple refs into a single ref callback.
 *
 * Useful when a component receives a forwarded `ref` AND needs its own
 * internal ref to the same node (focus traps, ResizeObserver, etc.).
 *
 * @example
 * const localRef = useRef<HTMLDivElement>(null);
 * <div ref={composeRefs(forwardedRef, localRef)} />
 */
export function composeRefs<T>(
  ...refs: PossibleRef<T>[]
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      setRef(ref, node as T);
    }
  };
}

/**
 * Hook flavor — stable callback that composes the given refs.
 */
export function useComposedRefs<T>(
  ...refs: PossibleRef<T>[]
): React.RefCallback<T> {
  return React.useCallback(
    composeRefs(...refs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs,
  );
}
