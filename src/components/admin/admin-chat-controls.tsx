"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Markdown } from "@/components/admin/markdown";
import { cn } from "@/lib/cn";

type Mode = "normal" | "review";

/** `false` on the server + first client render, `true` after hydration — gates
 * a client-only portal so it never causes an SSR mismatch. */
const emptySubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/* ── Rail open state (from @hearst/cockpit-shell) ───────────────────────── */

const RAIL_LS_KEY = "cockpit:rail-right-open";

function getRailOpenSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  const s = window.localStorage.getItem(RAIL_LS_KEY);
  return s === null ? true : s === "1";
}

function getRailOpenServerSnapshot(): boolean {
  return true;
}

function subscribeRailOpen(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === RAIL_LS_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/**
 * Mode selector for the Cockpit chat (Normal / Review), mounted GLOBALLY in the
 * product shell (AppChrome) so it is available on every product page — not just
 * /admin. Admin-gated: on mount it calls `GET /api/admin/review-mode`, which is
 * `requireAdmin`-protected; a 403 means "not an admin" and the component renders
 * nothing. So only admins (Pierre, etc.) ever see the selector.
 *
 * Visually anchored to the TOP of the right rail (the Kimi chat), under its
 * header — not a floating centred bar. In Review mode it exposes a "Générer le
 * document" action that distils the conversation into a structured change doc.
 *
 * Styling uses existing Cockpit CSS vars only (no new tokens / primitives).
 */
export function AdminChatControls() {
  // null = not yet resolved / not an admin → render nothing.
  const [mode, setMode] = useState<Mode | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const railOpen = useSyncExternalStore(
    subscribeRailOpen,
    getRailOpenSnapshot,
    getRailOpenServerSnapshot,
  );

  // Resolve admin status + current mode in one call. The route is
  // requireAdmin-gated: 200 → admin (use the returned mode); anything else
  // (403 non-admin, 401 logged-out) → stay null → render nothing.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/review-mode");
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as
          | { mode?: Mode }
          | null;
        if (!cancelled) {
          setMode(data?.mode === "review" ? "review" : "normal");
        }
      } catch {
        // Network error → leave null (hidden). Non-fatal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Portal target on document.body so the anchored bar escapes the
  // `ct-panels-row` stacking context (z-index:10) that would otherwise paint
  // over it. Created once via lazy initial state (client-only); the effect only
  // attaches/detaches it, so no setState runs inside the effect.
  const [portalEl] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("data-portal", "chat-mode-controls");
    return el;
  });
  useEffect(() => {
    if (!portalEl) return;
    document.body.appendChild(portalEl);
    return () => {
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  const switchMode = useCallback(async (next: Mode) => {
    setError(null);
    setSavingMode(true);
    setMode(next); // optimistic
    try {
      const res = await fetch("/api/admin/review-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Impossible d'enregistrer le mode.");
      setMode((prev) =>
        prev === next ? (next === "review" ? "normal" : "review") : prev,
      );
    } finally {
      setSavingMode(false);
    }
  }, []);

  const generateDocument = useCallback(async () => {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/review-document", { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { document?: { contentMd: string }; error?: string }
        | null;
      if (!res.ok || !data?.document) {
        throw new Error(data?.error ?? "Échec de la génération.");
      }
      setDoc(data.document.contentMd);
      setPanelOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la génération.");
    } finally {
      setGenerating(false);
    }
  }, []);

  const copyDoc = useCallback(() => {
    if (doc) void navigator.clipboard.writeText(doc);
  }, [doc]);

  const downloadDoc = useCallback(() => {
    if (!doc) return;
    const blob = new Blob([doc], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revue-produit-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [doc]);

  const hydrated = useHydrated();
  // Hidden until hydrated, portal ready, admin status resolved, and rail is open.
  if (!hydrated || !portalEl || mode === null || !railOpen) return null;

  return createPortal(
    <>
      {/* Anchored to the TOP of the right rail (chat), under its header.
          Width tracks --ct-rail-right-eff (420px open / 48px collapsed); the
          top offset clears the rail header ("Assistant" + product name).
          No backdrop-blur — the bar sits flush inside the rail, not floating. */}
      <div
        className="fixed right-0 top-[60px] z-[var(--ct-z-popover)] flex w-[var(--ct-rail-right-eff,420px)] items-center gap-2 border-b border-[var(--ct-border-soft)] bg-[var(--ct-surface-1)] px-4 py-2"
        role="toolbar"
        aria-label="Mode du chat"
      >
        {/* Mode toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => switchMode("normal")}
            disabled={savingMode}
            aria-pressed={mode === "normal"}
            className={cn(
              "h-8 rounded-[var(--ct-radius-full)] px-3 text-xs font-medium transition-[background-color,color] duration-[var(--ct-dur-base)]",
              "focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]",
              mode === "normal"
                ? "bg-[var(--ct-accent)] text-[var(--ct-bg-deep)]"
                : "text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)]",
            )}
          >
            Conversation
          </button>
          <button
            type="button"
            onClick={() => switchMode("review")}
            disabled={savingMode}
            aria-pressed={mode === "review"}
            className={cn(
              "h-8 rounded-[var(--ct-radius-full)] px-3 text-xs font-medium transition-[background-color,color] duration-[var(--ct-dur-base)]",
              "focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]",
              mode === "review"
                ? "bg-[var(--ct-accent)] text-[var(--ct-bg-deep)]"
                : "text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)]",
            )}
          >
            Review
          </button>
        </div>

        {mode === "review" && (
          <>
            <span
              className="h-5 w-px bg-[var(--ct-border-soft)]"
              aria-hidden="true"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={generateDocument}
              disabled={generating}
            >
              {generating ? "Génération…" : "Générer le document"}
            </Button>
            {doc && !panelOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPanelOpen(true)}
              >
                Voir
              </Button>
            )}
          </>
        )}
      </div>

      {error && (
        <div
          className="fixed right-4 top-[112px] z-[var(--ct-z-toast)] rounded-[var(--ct-radius-md)] border border-[var(--ct-status-danger-border)] bg-[var(--ct-status-danger-soft)] px-3 py-1.5 text-xs text-[var(--ct-status-danger)]"
          role="alert"
        >
          {error}
        </div>
      )}

      <Modal
        isOpen={panelOpen && doc !== null}
        onClose={() => setPanelOpen(false)}
        title="Plan de modifications suggérées"
        headerActions={
          <>
            <Button variant="ghost" size="sm" onClick={copyDoc}>
              Copier
            </Button>
            <Button variant="secondary" size="sm" onClick={downloadDoc}>
              Télécharger .md
            </Button>
          </>
        }
      >
        {doc && <Markdown content={doc} />}
      </Modal>
    </>,
    portalEl,
  );
}
