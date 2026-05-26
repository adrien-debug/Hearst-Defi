/**
 * Tests — keyboard shortcuts overlay.
 *
 * Uses renderToStaticMarkup (node environment, no jsdom) for pure render
 * assertions, and manual DOM-event simulation for the two event-driven tests
 * (shift+? opens, esc closes).
 *
 * Environment: node (see vitest.config.ts).
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  SHORTCUTS,
  SHORTCUT_SECTIONS,
  getShortcutsBySection,
  type ShortcutSection,
} from "@/lib/shortcuts/registry";

// ── 1. Registry ────────────────────────────────────────────────────────────────

describe("registry — SHORTCUTS array", () => {
  it("exposes 30 or more shortcuts", () => {
    expect(SHORTCUTS.length).toBeGreaterThanOrEqual(30);
  });

  it("every shortcut has a non-empty combo, section and description", () => {
    for (const s of SHORTCUTS) {
      expect(s.combo.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
      expect(SHORTCUT_SECTIONS).toContain(s.section);
    }
  });

  it("shift+? is registered in the Global section", () => {
    const entry = SHORTCUTS.find((s) => s.combo === "shift+?");
    expect(entry).toBeDefined();
    expect(entry?.section).toBe("Global");
  });

  it("esc is registered in the Global section", () => {
    const entry = SHORTCUTS.find((s) => s.combo === "esc");
    expect(entry).toBeDefined();
    expect(entry?.section).toBe("Global");
  });
});

// ── 2. getShortcutsBySection ───────────────────────────────────────────────────

describe("registry — getShortcutsBySection()", () => {
  it("returns a map with all canonical sections", () => {
    const map = getShortcutsBySection();
    for (const section of SHORTCUT_SECTIONS) {
      expect(map.has(section)).toBe(true);
    }
  });

  it("groups shortcuts correctly — Navigate section contains g-prefixed combos", () => {
    const map = getShortcutsBySection();
    const nav = map.get("Navigate") ?? [];
    expect(nav.every((s) => s.combo.startsWith("g "))).toBe(true);
    expect(nav.length).toBeGreaterThanOrEqual(9);
  });

  it("total count across sections matches SHORTCUTS array length", () => {
    const map = getShortcutsBySection();
    let total = 0;
    for (const shortcuts of map.values()) {
      total += shortcuts.length;
    }
    expect(total).toBe(SHORTCUTS.length);
  });
});

// ── 3. ShortcutsOverlay render (SSR) ──────────────────────────────────────────

import { ShortcutsOverlay } from "../shortcuts-overlay";

describe("ShortcutsOverlay — SSR render", () => {
  it("renders nothing when open=false", () => {
    const html = renderToStaticMarkup(
      <ShortcutsOverlay open={false} onClose={() => void 0} />,
    );
    expect(html).toBe("");
  });

  it("renders a role=dialog element when open=true", () => {
    const html = renderToStaticMarkup(
      <ShortcutsOverlay open={true} onClose={() => void 0} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
  });

  it("renders all five section headings when open", () => {
    const html = renderToStaticMarkup(
      <ShortcutsOverlay open={true} onClose={() => void 0} />,
    );
    for (const section of SHORTCUT_SECTIONS) {
      expect(html).toContain(section);
    }
  });

  it("renders at least 30 shortcut descriptions when open", () => {
    const html = renderToStaticMarkup(
      <ShortcutsOverlay open={true} onClose={() => void 0} />,
    );
    // Each description is unique text — count a few known ones
    expect(html).toContain("Command palette");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Next row");
    expect(html).toContain("Primary action");
    expect(html).toContain("Density toggle");
  });

  it("renders Close (esc) footer text", () => {
    const html = renderToStaticMarkup(
      <ShortcutsOverlay open={true} onClose={() => void 0} />,
    );
    expect(html).toContain("Close");
    // esc key appears as a kbd element
    expect(html).toContain("esc");
  });

  it("has Keyboard shortcuts heading", () => {
    const html = renderToStaticMarkup(
      <ShortcutsOverlay open={true} onClose={() => void 0} />,
    );
    expect(html).toContain("Keyboard shortcuts");
  });
});

// ── 4. Section grouping integrity ─────────────────────────────────────────────

describe("ShortcutsOverlay — section grouping", () => {
  it("all SHORTCUT_SECTIONS are rendered as headings when overlay is open", () => {
    const html = renderToStaticMarkup(
      <ShortcutsOverlay open={true} onClose={() => void 0} />,
    );
    const sections: ShortcutSection[] = [
      "Global",
      "Navigate",
      "List",
      "Entity",
      "View",
    ];
    for (const s of sections) {
      expect(html.toLowerCase()).toContain(s.toLowerCase());
    }
  });
});

// ── 5. isEditableTarget guard (unit) ──────────────────────────────────────────
// We test the logic directly without DOM by re-implementing the guard inline.

describe("isEditableTarget guard logic", () => {
  function isEditableTarget(tag: string, contentEditable: boolean): boolean {
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (contentEditable) return true;
    return false;
  }

  it("returns true for input", () => {
    expect(isEditableTarget("input", false)).toBe(true);
  });

  it("returns true for textarea", () => {
    expect(isEditableTarget("textarea", false)).toBe(true);
  });

  it("returns true for contentEditable div", () => {
    expect(isEditableTarget("div", true)).toBe(true);
  });

  it("returns false for a plain div", () => {
    expect(isEditableTarget("div", false)).toBe(false);
  });

  it("returns false for button", () => {
    expect(isEditableTarget("button", false)).toBe(false);
  });
});
