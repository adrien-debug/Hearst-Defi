"use client";

/**
 * CommandPaletteProvider
 *
 * Mounts a global ⌘K (Mac) / Ctrl+K (Win/Linux) listener and renders
 * the <CommandPalette> portal. Wrap the app shell with this provider
 * (or any subtree that needs palette access).
 *
 * Usage:
 *   import { CommandPaletteProvider, useCommandPalette }
 *     from "@/components/power/command-palette-provider";
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { CommandPalette } from "@/components/power/command-palette";
import {
  COMMAND_REGISTRY,
  type Command,
} from "@/lib/power/commands";

// ── Context ───────────────────────────────────────────────────────────────────

interface CommandPaletteContextValue {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used inside <CommandPaletteProvider>",
    );
  }
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface CommandPaletteProviderProps {
  children: ReactNode;
}

export function CommandPaletteProvider({
  children,
}: CommandPaletteProviderProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);
  const togglePalette = useCallback(() => setOpen((v) => !v), []);

  // ⌘K / Ctrl+K global listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key === "k") {
        e.preventDefault();
        togglePalette();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePalette]);

  // Build hydrated command list — inject router-based handlers
  const commands: Command[] = COMMAND_REGISTRY.map((cmd) => {
    if (cmd.href) {
      return {
        ...cmd,
        handler: () => {
          router.push(cmd.href as string);
          closePalette();
        },
      };
    }
    // Action / Search / View commands: no-op handler by default.
    // Feature teams override by replacing the registry entry.
    return {
      ...cmd,
      handler: cmd.handler ?? (() => closePalette()),
    };
  });

  return (
    <CommandPaletteContext.Provider
      value={{ open, openPalette, closePalette, togglePalette }}
    >
      {children}
      {open && (
        <CommandPalette commands={commands} onClose={closePalette} />
      )}
    </CommandPaletteContext.Provider>
  );
}
