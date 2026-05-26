"use client";

import * as React from "react";

type SetStateFn<T> = (prev: T) => T;

interface UseControllableStateOptions<T> {
  /** Controlled value. When defined, the hook is in controlled mode. */
  prop?: T | undefined;
  /** Initial value when uncontrolled. */
  defaultProp?: T | undefined;
  /** Called whenever the value changes (controlled OR uncontrolled). */
  onChange?: (value: T) => void;
}

/**
 * Controlled / uncontrolled state pattern (Radix internals flavor).
 *
 * Returns `[value, setValue]` where:
 * - If `prop` is defined → controlled: `value === prop`, `setValue` calls `onChange` only.
 * - If `prop` is undefined → uncontrolled: internal `useState` backed by `defaultProp`.
 *
 * The setter accepts either a new value or an updater function `(prev) => next`,
 * matching `React.useState`'s signature.
 */
export function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateOptions<T>): readonly [
  T | undefined,
  (next: T | SetStateFn<T | undefined>) => void,
] {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<
    T | undefined
  >(defaultProp);
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledValue;

  // Keep onChange stable-ish without forcing the caller to memoize.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const setValue = React.useCallback(
    (next: T | SetStateFn<T | undefined>) => {
      if (isControlled) {
        const resolved =
          typeof next === "function"
            ? (next as SetStateFn<T | undefined>)(prop)
            : next;
        if (resolved !== prop && resolved !== undefined) {
          onChangeRef.current?.(resolved);
        }
      } else {
        setUncontrolledValue((prev) => {
          const resolved =
            typeof next === "function"
              ? (next as SetStateFn<T | undefined>)(prev)
              : next;
          if (resolved !== prev && resolved !== undefined) {
            onChangeRef.current?.(resolved);
          }
          return resolved;
        });
      }
    },
    [isControlled, prop],
  );

  return [value, setValue] as const;
}
