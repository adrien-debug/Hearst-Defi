/**
 * Global keyboard shortcut registry.
 *
 * Pure data — no DOM, no React, no I/O. Safe to import from server or client.
 */

export type ShortcutSection =
  | "Global"
  | "Navigate"
  | "List"
  | "Entity"
  | "View";

export interface Shortcut {
  /** Human-readable combo, e.g. "cmd+k", "shift+?", "g d", "j", "esc" */
  combo: string;
  section: ShortcutSection;
  description: string;
}

export const SHORTCUTS: Shortcut[] = [
  // ── Global ──────────────────────────────────────────────────────────────────
  { combo: "cmd+k", section: "Global", description: "Command palette" },
  { combo: "cmd+/", section: "Global", description: "Global search" },
  { combo: "cmd+b", section: "Global", description: "Toggle sidebar" },
  { combo: "cmd+.", section: "Global", description: "Settings" },
  { combo: "shift+?", section: "Global", description: "Help & shortcuts" },
  { combo: "esc", section: "Global", description: "Close / cancel" },

  // ── Navigate (g + key) ──────────────────────────────────────────────────────
  { combo: "g d", section: "Navigate", description: "Dashboard" },
  { combo: "g v", section: "Navigate", description: "Vaults" },
  { combo: "g i", section: "Navigate", description: "Investors" },
  { combo: "g x", section: "Navigate", description: "Distributions" },
  { combo: "g p", section: "Navigate", description: "Proofs" },
  { combo: "g s", section: "Navigate", description: "Signers" },
  { combo: "g c", section: "Navigate", description: "Scenarios" },
  { combo: "g m", section: "Navigate", description: "Memos" },
  { combo: "g a", section: "Navigate", description: "Audit" },

  // ── List ────────────────────────────────────────────────────────────────────
  { combo: "j", section: "List", description: "Next row" },
  { combo: "k", section: "List", description: "Previous row" },
  { combo: "enter", section: "List", description: "Open row" },
  { combo: "x", section: "List", description: "Select for batch" },
  { combo: "shift+x", section: "List", description: "Range select" },
  { combo: "cmd+a", section: "List", description: "Select all" },
  { combo: "/", section: "List", description: "Focus filter" },
  { combo: "r", section: "List", description: "Refresh" },

  // ── Entity ──────────────────────────────────────────────────────────────────
  { combo: "e", section: "Entity", description: "Edit" },
  { combo: "cmd+s", section: "Entity", description: "Save" },
  { combo: "[", section: "Entity", description: "Previous entity" },
  { combo: "]", section: "Entity", description: "Next entity" },
  { combo: "cmd+enter", section: "Entity", description: "Primary action" },

  // ── View ────────────────────────────────────────────────────────────────────
  { combo: "cmd+shift+d", section: "View", description: "Density toggle" },
  { combo: "cmd+shift+t", section: "View", description: "Theme toggle" },
  { combo: "v", section: "View", description: "Saved views menu" },
] as const satisfies Shortcut[];

/** All section labels in display order. */
export const SHORTCUT_SECTIONS: ShortcutSection[] = [
  "Global",
  "Navigate",
  "List",
  "Entity",
  "View",
];

/** Return shortcuts grouped by section, in canonical section order. */
export function getShortcutsBySection(): Map<ShortcutSection, Shortcut[]> {
  const map = new Map<ShortcutSection, Shortcut[]>();
  for (const section of SHORTCUT_SECTIONS) {
    map.set(section, []);
  }
  for (const shortcut of SHORTCUTS) {
    map.get(shortcut.section)!.push(shortcut);
  }
  return map;
}
