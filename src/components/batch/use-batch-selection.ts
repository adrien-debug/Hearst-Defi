"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  UseBatchSelectionOptions,
  UseBatchSelectionReturn,
} from "@/lib/batch/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readStorage(key: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return new Set<string>();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set<string>(parsed as string[]);
  } catch {
    // Ignore parse errors — start clean.
  }
  return new Set<string>();
}

function writeStorage(key: string, selected: Set<string>): void {
  try {
    sessionStorage.setItem(key, JSON.stringify([...selected]));
  } catch {
    // Ignore quota errors.
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBatchSelection<T extends { id: string }>({
  items,
  storageKey,
}: UseBatchSelectionOptions<T>): UseBatchSelectionReturn<T> {
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (typeof window !== "undefined" && storageKey) {
      return readStorage(storageKey);
    }
    return new Set<string>();
  });

  // Sync to sessionStorage whenever selection changes.
  useEffect(() => {
    if (storageKey) writeStorage(storageKey, selected);
  }, [selected, storageKey]);

  const isSelected = useCallback(
    (id: string) => selected.has(id),
    [selected],
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleRange = useCallback(
    (from: string, to: string) => {
      const fromIdx = items.findIndex((item) => item.id === from);
      const toIdx = items.findIndex((item) => item.id === to);
      if (fromIdx === -1 || toIdx === -1) return;

      const start = Math.min(fromIdx, toIdx);
      const end = Math.max(fromIdx, toIdx);
      const rangeIds = items.slice(start, end + 1).map((item) => item.id);

      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of rangeIds) next.add(id);
        return next;
      });
    },
    [items],
  );

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map((item) => item.id)));
  }, [items]);

  const clear = useCallback(() => {
    setSelected(new Set<string>());
  }, []);

  const selectedItems = items.filter((item) => selected.has(item.id));

  return {
    selected,
    isSelected,
    toggle,
    toggleRange,
    selectAll,
    clear,
    selectedItems,
  };
}
