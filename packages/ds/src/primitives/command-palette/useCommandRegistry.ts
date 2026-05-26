"use client";

/**
 * @ds/core/primitives/command-palette/useCommandRegistry
 *
 * Lightweight global registry so any subtree can register commands at mount,
 * unregister at unmount, and any subscriber can read the union.
 *
 * No React context — uses a module-scoped subscription store so it survives
 * across portals / multiple Provider trees.
 */

import { useEffect, useSyncExternalStore } from "react";

import type { CommandPaletteCommand } from "./command-palette.types";

type Listener = () => void;
type Snapshot = readonly CommandPaletteCommand[];

const registry: Map<string, CommandPaletteCommand> = new Map();
const listeners: Set<Listener> = new Set();
let snapshot: Snapshot = Object.freeze([]);

function refreshSnapshot(): void {
  snapshot = Object.freeze(Array.from(registry.values()));
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return snapshot;
}

/**
 * Register a list of commands for the lifetime of the calling component.
 * Returns the current global snapshot for convenience.
 *
 * @example
 * useCommandRegistry([
 *   { id: "go.home", label: "Go home", group: "Nav", action: () => router.push("/") },
 * ]);
 */
export function useCommandRegistry(
  toRegister?: readonly CommandPaletteCommand[],
): Snapshot {
  useEffect(() => {
    if (!toRegister || toRegister.length === 0) return;
    const ids = toRegister.map((c) => c.id);
    toRegister.forEach((c) => {
      registry.set(c.id, c);
    });
    refreshSnapshot();
    return () => {
      ids.forEach((id) => {
        registry.delete(id);
      });
      refreshSnapshot();
    };
  }, [toRegister]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Imperative escape hatch — register / unregister without a hook. */
export const commandRegistry = {
  register(cmd: CommandPaletteCommand): () => void {
    registry.set(cmd.id, cmd);
    refreshSnapshot();
    return () => {
      registry.delete(cmd.id);
      refreshSnapshot();
    };
  },
  list(): Snapshot {
    return snapshot;
  },
  clear(): void {
    registry.clear();
    refreshSnapshot();
  },
};
