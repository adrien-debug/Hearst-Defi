"use client";

import * as React from "react";

/**
 * Tailwind utility class string equivalent to the canonical "sr-only" recipe.
 * Returned as a string so callers can compose with `cn()`.
 */
export function srOnly(): string {
  return "absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 m-[-1px] [clip:rect(0,0,0,0)]";
}

/**
 * Canonical focus-ring classes for any interactive element.
 * Drives WCAG AAA visible focus (CONTRACT.md §6).
 */
export function focusRingClasses(): string {
  return [
    "outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-offset-2",
    "focus-visible:ring-[color:var(--ds-color-focus-ring)]",
    "focus-visible:ring-offset-[color:var(--ds-color-background)]",
    "transition-shadow",
  ].join(" ");
}

/**
 * Returns the props an interactive non-button element (`<div role="button">`,
 * custom toggle) should spread to be keyboard- + screen-reader-correct
 * given a `disabled` flag.
 */
export function getInteractiveAttributes(disabled?: boolean): {
  tabIndex?: number;
  "aria-disabled"?: boolean;
} {
  if (disabled) {
    return { tabIndex: -1, "aria-disabled": true };
  }
  return { tabIndex: 0 };
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

function getFocusable(node: HTMLElement): HTMLElement[] {
  return Array.from(
    node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      el.offsetParent !== null,
  );
}

/**
 * Trap focus within `ref` while `active` is true.
 * Restores focus to the previously-active element on deactivation.
 */
export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
): void {
  React.useEffect(() => {
    if (!active) return;
    if (typeof document === "undefined") return;
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = getFocusable(node);
    focusables[0]?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Tab") return;
      const current = getFocusable(node);
      if (current.length === 0) {
        event.preventDefault();
        return;
      }
      const first = current[0];
      const last = current[current.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeEl === first || !node.contains(activeEl)) {
          event.preventDefault();
          last?.focus();
        }
      } else {
        if (activeEl === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [ref, active]);
}

/**
 * Calls `cb` whenever the Escape key is pressed.
 */
export function useEscapeKey(cb: () => void, enabled: boolean = true): void {
  React.useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        cb();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cb, enabled]);
}

/**
 * Calls `cb` when a `pointerdown` happens outside the ref'd element.
 * Use for popovers, dropdowns, modals' overlay dismissal, etc.
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  cb: () => void,
): void {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = (event: PointerEvent): void => {
      const node = ref.current;
      if (!node) return;
      const target = event.target as Node | null;
      if (target && node.contains(target)) return;
      cb();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [ref, cb]);
}
