"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { UndoToastOptions } from "@/lib/batch/types";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface ToastState extends UndoToastOptions {
  id: number;
}

// Module-level singleton so callers don't need context wiring.
let _setToastFn: ((state: ToastState | null) => void) | null = null;
let _idCounter = 0;

/**
 * Imperatively show an undo toast from anywhere in the app.
 *
 * ```ts
 * showUndoToast({ label: "3 items approved", undo: async () => { ... } });
 * ```
 *
 * Requires `<UndoToastProvider />` to be mounted in the tree.
 */
export function showUndoToast(opts: UndoToastOptions): void {
  if (!_setToastFn) {
    // Fail silently in SSR or when provider is not mounted.
    return;
  }
  _setToastFn({ ...opts, id: ++_idCounter });
}

// ---------------------------------------------------------------------------
// Provider / renderer
// ---------------------------------------------------------------------------

/**
 * Mount once at the app root (or layout) to enable `showUndoToast`.
 * Renders the active toast in the bottom-left corner.
 */
export function UndoToastProvider() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Register the setter so `showUndoToast` can reach it.
  useEffect(() => {
    _setToastFn = setToast;
    return () => {
      _setToastFn = null;
    };
  }, []);

  const dismiss = useCallback(() => {
    setToast(null);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Auto-dismiss after durationMs.
  useEffect(() => {
    if (!toast) return;
    const duration = toast.durationMs ?? 10_000;
    timerRef.current = setTimeout(dismiss, duration);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [toast, dismiss]);

  const handleUndo = useCallback(async () => {
    if (!toast) return;
    dismiss();
    await toast.undo();
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        // Position
        "fixed bottom-6 left-6 z-[9999]",
        // Surface
        "flex items-center gap-3",
        "rounded-[var(--ct-radius-lg)]",
        "bg-[var(--ct-surface-2)]",
        "border border-[var(--ct-border-soft)]",
        "px-4 py-2.5",
        "shadow-[var(--ct-shadow-elevated)]",
        "text-sm text-[var(--ct-text-primary)]",
        // Animation
        "animate-in slide-in-from-bottom-2 fade-in duration-200",
      )}
      data-testid="undo-toast"
    >
      <span className="flex-1">{toast.label}</span>
      <button
        type="button"
        onClick={() => void handleUndo()}
        className={cn(
          "rounded-[var(--ct-radius-full)]",
          "px-2.5 py-1 text-xs font-semibold",
          "bg-[var(--ct-accent)] text-[var(--ct-bg-deep)]",
          "hover:bg-[var(--ct-accent-strong)]",
          "transition-colors duration-[var(--ct-dur-base)]",
          "focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]",
        )}
        aria-label="Undo last action"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={dismiss}
        className={cn(
          "rounded-[var(--ct-radius-full)]",
          "p-1 text-[var(--ct-text-muted)]",
          "hover:text-[var(--ct-text-primary)] hover:bg-[var(--ct-surface-3)]",
          "transition-colors duration-[var(--ct-dur-base)]",
          "focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]",
        )}
        aria-label="Dismiss notification"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1 1L11 11M11 1L1 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
