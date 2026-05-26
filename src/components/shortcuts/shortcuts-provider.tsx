"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ShortcutsOverlay } from "./shortcuts-overlay";

// ── Context ────────────────────────────────────────────────────────────────────

interface ShortcutsContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function useShortcuts(): ShortcutsContextValue {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) {
    throw new Error("useShortcuts must be used inside <ShortcutsProvider>");
  }
  return ctx;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns true if the event target is an interactive text input where
 * keyboard shortcuts should NOT fire.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export interface ShortcutsProviderProps {
  children: ReactNode;
}

export function ShortcutsProvider({ children }: ShortcutsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // shift+? — opens the overlay.
      // Key "?" is produced by shift+/ on most keyboard layouts.
      // We match on key === "?" AND shiftKey to be layout-safe.
      if (e.key === "?" && e.shiftKey) {
        // Never fire inside an input / textarea / contenteditable
        if (isEditableTarget(e.target)) return;

        // Avoid swallowing shortcuts from other providers (cmd+k, cmd+/, etc.)
        // by checking that no other modifier is pressed.
        if (e.metaKey || e.ctrlKey || e.altKey) return;

        e.preventDefault();
        toggle();
        return;
      }

      // Esc closes the overlay (overlay body also handles this independently
      // via its own keydown listener; this handler is a belt-and-suspenders
      // guard for edge cases where the panel is not yet focused).
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close, toggle]);

  return (
    <ShortcutsContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
      <ShortcutsOverlay open={isOpen} onClose={close} />
    </ShortcutsContext.Provider>
  );
}
