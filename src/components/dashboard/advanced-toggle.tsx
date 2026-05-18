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

interface ProviderProps {
  children: React.ReactNode;
}

export function AdvancedProvider({ children }: ProviderProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "true") {
        // Use a timeout to avoid synchronous setState in effect warning
        setTimeout(() => setEnabled(true), 0);
      }
    } catch {
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
      suppressHydrationWarning
      className={cn(
        "group inline-flex items-center gap-3 rounded-full",
        "glass-panel-subtle px-4 py-2",
        "text-xs font-medium text-white/80",
        "transition-all duration-300",
        "hover:bg-white/5 hover:text-white hover:border-white/20",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        className,
      )}
    >
      Advanced
      <span
        aria-hidden
        className={cn(
          "relative inline-block h-5 w-9 shrink-0 rounded-full",
          "transition-colors duration-300 shadow-inner",
          enabled ? "bg-white/30 border border-white/40" : "bg-black/40 border border-white/10",
        )}
        suppressHydrationWarning
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 block h-3.5 w-3.5 rounded-full bg-white shadow-sm",
            "transition-transform duration-300 ease-out",
            enabled ? "translate-x-4" : "translate-x-0 opacity-70",
          )}
          style={enabled ? { boxShadow: "var(--ct-glow-strong)" } : undefined}
          suppressHydrationWarning
        />
      </span>
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
      hidden={!enabled}
      suppressHydrationWarning
      aria-hidden={!enabled}
      className={cn(
        "transition-all duration-500 ease-out overflow-hidden",
        enabled ? "opacity-100 max-h-[31.25rem] translate-y-0" : "opacity-0 max-h-0 -translate-y-4"
      )}
    >
      {children}
    </div>
  );
}
