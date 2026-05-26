/**
 * Batch action system — shared types.
 *
 * Consumed by `useBatchSelection`, `BatchSelectionBar`, `BatchActionButton`,
 * and `UndoToast`. Pure types, no runtime deps.
 */

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface UseBatchSelectionOptions<T extends { id: string }> {
  /** Full list of items that can be selected. */
  items: T[];
  /**
   * Optional sessionStorage key to persist selection across re-renders.
   * When omitted, selection lives only in component state.
   */
  storageKey?: string;
}

export interface UseBatchSelectionReturn<T extends { id: string }> {
  /** Currently selected item ids. */
  selected: Set<string>;
  /** Returns true if the given id is in the selection. */
  isSelected: (id: string) => boolean;
  /** Toggle a single id in/out of the selection. */
  toggle: (id: string) => void;
  /**
   * Range-select: selects every item whose index lies between `from` and `to`
   * (inclusive, order-independent). Both ids must exist in `items`.
   */
  toggleRange: (from: string, to: string) => void;
  /** Select every item in the `items` list. */
  selectAll: () => void;
  /** Clear the entire selection. */
  clear: () => void;
  /** Convenience: the full `T` objects for every selected id. */
  selectedItems: T[];
}

// ---------------------------------------------------------------------------
// Undo Toast
// ---------------------------------------------------------------------------

export interface UndoToastOptions {
  /** Human-readable label, e.g. "3 items approved". */
  label: string;
  /** Async callback invoked when the user clicks Undo. */
  undo: () => Promise<void>;
  /** Auto-dismiss delay in ms. Defaults to 10 000. */
  durationMs?: number;
}
