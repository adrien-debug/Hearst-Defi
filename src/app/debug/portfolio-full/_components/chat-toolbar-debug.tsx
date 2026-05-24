"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

/**
 * Toolbar Conversation / Review du chat Kimi — version debug.
 *
 * Avant : `fixed right-0 top-[60px]` portalisée sur `document.body`. La barre
 * flottait au-dessus du chat, décorrélée du scroll, du collapse du rail droit,
 * et des changements de viewport — d'où l'impression qu'elle n'était pas
 * "intégrée" au chat.
 *
 * Maintenant : portalisée DANS `<div class="ct-rail-right-body">` (le corps
 * du chat exposé par `@hearst/cockpit-shell`). Positionnée en `sticky top-0`
 * dans le flow du body — elle suit naturellement le chat, la largeur hérite
 * du rail, le collapse fonctionne sans calcul de variable CSS externe.
 *
 * Garde le LOOK 1:1 (mêmes pilules, accent, hover, focus). Tout vit en local
 * sur la page `/debug/portfolio-full`.
 */

type Mode = "conversation" | "review";

const PILL_BASE_CLASS = cn(
  "h-8 rounded-[var(--ct-radius-full)] px-3 text-xs font-medium",
  "transition-[background-color,color] duration-[var(--ct-dur-base)]",
  "focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]",
);

function pillClass(active: boolean): string {
  return cn(
    PILL_BASE_CLASS,
    active
      ? "bg-[var(--ct-accent)] text-[var(--ct-bg-deep)]"
      : "text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)]",
  );
}

export function ChatToolbarDebug() {
  const [mode, setMode] = useState<Mode>("conversation");
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    // Anchor inside the chat rail body so the toolbar is part of the chat
    // layout (sticky, collapses with the rail) rather than a floating overlay.
    const el = document.querySelector(".ct-rail-right-body");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTarget(el);
  }, []);

  if (!target) return null;

  return createPortal(
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center gap-2",
        "border-b border-[var(--ct-border-soft)] bg-[var(--ct-surface-1)]",
        "px-4 py-2",
      )}
      role="toolbar"
      aria-label="Mode du chat (debug clone)"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMode("conversation")}
          aria-pressed={mode === "conversation"}
          className={pillClass(mode === "conversation")}
        >
          Conversation
        </button>
        <button
          type="button"
          onClick={() => setMode("review")}
          aria-pressed={mode === "review"}
          className={pillClass(mode === "review")}
        >
          Review
        </button>
      </div>
    </div>,
    target,
  );
}
