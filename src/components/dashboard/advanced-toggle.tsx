"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { cn } from "@/lib/cn";

const STORAGE_KEY = "hearst.dashboard.advanced";

interface AdvancedContextValue {
  enabled: boolean;
  toggle: () => void;
}

const AdvancedContext = createContext<AdvancedContextValue | null>(null);

function useAdvanced(): AdvancedContextValue {
  const ctx = useContext(AdvancedContext);
  if (ctx === null) {
    throw new Error(
      "AdvancedTrigger / AdvancedContent must be rendered inside <AdvancedProvider>.",
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Advanced view toggle.
//
// - State is persisted in localStorage under `hearst.dashboard.advanced`.
// - Default is OFF. The first paint always matches the default so SSR and
//   the initial client paint agree (no hydration mismatch). On mount we read
//   storage and reveal the wrapped content if the user previously turned the
//   toggle ON.
// - Split into AdvancedProvider + AdvancedTrigger + AdvancedContent so the
//   switch can live in the page header while the wrapped row lives further
//   down — both share state through React context. The Server Component
//   children passed to `AdvancedContent` are always rendered (just hidden
//   via the `hidden` attribute) so toggling is a pure DOM visibility flip —
//   zero layout shift after the initial paint.
// ---------------------------------------------------------------------------

interface ProviderProps {
  children: React.ReactNode;
}

export function AdvancedProvider({ children }: ProviderProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "true") setEnabled(true);
    } catch {
      // localStorage unavailable (e.g. privacy mode) — keep default OFF.
    }
  }, []);

  const value = useMemo<AdvancedContextValue>(
    () => ({
      enabled,
      toggle() {
        setEnabled((prev) => {
          const next = !prev;
          try {
            window.localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
          } catch {
            // ignore — UI still works for the session.
          }
          return next;
        });
      },
    }),
    [enabled],
  );

  return (
    <AdvancedContext.Provider value={value}>{children}</AdvancedContext.Provider>
  );
}

interface TriggerProps {
  className?: string;
}

export function AdvancedTrigger({ className }: TriggerProps) {
  const { enabled, toggle } = useAdvanced();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Toggle advanced risk ratios"
      onClick={toggle}
      // suppressHydrationWarning is intentional: the visual state depends on
      // localStorage which is only available client-side, so the first paint
      // can differ from the post-hydration paint.
      suppressHydrationWarning
      className={cn(
        "group inline-flex items-center gap-2 rounded-[--radius-button]",
        "border border-[--color-border] bg-[--color-bg-card] px-3 py-1.5",
        "text-xs font-medium text-[--color-text]",
        "transition-colors duration-150",
        "hover:border-[--color-border-strong]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brand]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative inline-block h-4 w-7 shrink-0 rounded-full",
          "transition-colors duration-150",
          enabled ? "bg-[--color-brand]" : "bg-[--color-border-strong]",
        )}
        suppressHydrationWarning
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 block h-3 w-3 rounded-full bg-white",
            "transition-transform duration-150",
            enabled ? "translate-x-3" : "translate-x-0",
          )}
          suppressHydrationWarning
        />
      </span>
      Advanced
    </button>
  );
}

interface ContentProps {
  children: React.ReactNode;
}

export function AdvancedContent({ children }: ContentProps) {
  const { enabled } = useAdvanced();
  return (
    <div
      // Hidden until the user opts in. We use the HTML `hidden` attribute
      // (vs unmounting) so the Server-rendered content is preserved in the
      // DOM and toggling is a pure DOM visibility flip.
      hidden={!enabled}
      suppressHydrationWarning
      aria-hidden={!enabled}
    >
      {children}
    </div>
  );
}

