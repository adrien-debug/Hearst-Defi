"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/admin/markdown";
import { cn } from "@/lib/cn";

type Mode = "normal" | "review";

const LS_MODEL = "cockpit:chat-model";

const MODELS = [
  { value: "kimi-k2.6", label: "Kimi K2.6" },
  { value: "kimi-k2.6-anthropic", label: "Kimi K2.6 (Anthropic)" },
] as const;

interface AdminChatControlsProps {
  /** Server-resolved current mode for this admin. */
  initialMode: Mode;
}

/**
 * Floating control bar for the admin cockpit chat:
 *   - LLM selector (writes the localStorage key the package chat reads).
 *   - Normal / Review mode toggle (persisted server-side per admin; the
 *     cockpit-chat route swaps the system prompt accordingly).
 *   - In Review mode, a "Générer le document" action distils the current
 *     conversation into a structured change document shown in a panel.
 *
 * Styling uses existing Cockpit CSS vars only (no new tokens / primitives).
 */
export function AdminChatControls({ initialMode }: AdminChatControlsProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [model, setModel] = useState<string>("kimi-k2.6");
  const [savingMode, setSavingMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Portal target on document.body so the fixed bar escapes the
  // `ct-panels-row` stacking context (z-index:10) that would otherwise paint
  // over it — same reason InvestorRailIntra portals.
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-portal", "admin-chat-controls");
    document.body.appendChild(el);
    portalRef.current = el;
    setPortalReady(true);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  // Hydrate the model from the same localStorage key the package chat uses.
  useEffect(() => {
    const stored = window.localStorage.getItem(LS_MODEL);
    if (stored && MODELS.some((m) => m.value === stored)) {
      setModel(stored);
    }
  }, []);

  const onModelChange = useCallback((value: string) => {
    setModel(value);
    window.localStorage.setItem(LS_MODEL, value);
  }, []);

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
      setMode((prev) => (prev === next ? (next === "review" ? "normal" : "review") : prev));
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

  if (!portalReady || !portalRef.current) return null;

  return createPortal(
    <>
      <div
        className="fixed bottom-4 left-1/2 z-[1200] flex -translate-x-1/2 items-center gap-2 rounded-[var(--ct-radius-full)] border border-[var(--ct-border-soft)] bg-[var(--ct-surface-1)] px-2 py-1.5 shadow-[var(--ct-shadow-soft)] backdrop-blur-xl"
        role="toolbar"
        aria-label="Contrôles du chat admin"
      >
        {/* Mode toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => switchMode("normal")}
            disabled={savingMode}
            aria-pressed={mode === "normal"}
            className={cn(
              "h-8 rounded-[var(--ct-radius-full)] px-3 text-xs font-medium transition-all",
              mode === "normal"
                ? "bg-[var(--ct-accent)] text-[var(--ct-bg-deep)]"
                : "text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)]",
            )}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => switchMode("review")}
            disabled={savingMode}
            aria-pressed={mode === "review"}
            className={cn(
              "h-8 rounded-[var(--ct-radius-full)] px-3 text-xs font-medium transition-all",
              mode === "review"
                ? "bg-[var(--ct-accent)] text-[var(--ct-bg-deep)]"
                : "text-[var(--ct-text-muted)] hover:text-[var(--ct-text-strong)]",
            )}
          >
            Review
          </button>
        </div>

        <span className="h-5 w-px bg-[var(--ct-border-soft)]" aria-hidden="true" />

        {/* Model selector */}
        <label className="sr-only" htmlFor="admin-chat-model">
          Modèle LLM
        </label>
        <select
          id="admin-chat-model"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="h-8 rounded-[var(--ct-radius-full)] border border-[var(--ct-border-soft)] bg-[var(--ct-surface-0)] px-3 text-xs text-[var(--ct-text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]"
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {mode === "review" && (
          <>
            <span className="h-5 w-px bg-[var(--ct-border-soft)]" aria-hidden="true" />
            <Button
              variant="primary"
              size="sm"
              onClick={generateDocument}
              disabled={generating}
            >
              {generating ? "Génération…" : "Générer le document"}
            </Button>
            {doc && !panelOpen && (
              <Button variant="ghost" size="sm" onClick={() => setPanelOpen(true)}>
                Voir
              </Button>
            )}
          </>
        )}
      </div>

      {error && (
        <div
          className="fixed bottom-16 left-1/2 z-[1200] -translate-x-1/2 rounded-[var(--ct-radius-md)] border border-[var(--ct-status-danger-border)] bg-[var(--ct-status-danger-soft)] px-3 py-1.5 text-xs text-[var(--ct-status-danger)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {panelOpen && doc && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Document de modifications suggérées"
          onClick={() => setPanelOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--ct-radius-lg)] border border-[var(--ct-border-soft)] bg-[var(--ct-surface-1)] shadow-[var(--ct-shadow-soft)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--ct-border-soft)] px-5 py-3">
              <span className="text-sm font-semibold text-[var(--ct-text-strong)]">
                Plan de modifications suggérées
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={copyDoc}>
                  Copier
                </Button>
                <Button variant="secondary" size="sm" onClick={downloadDoc}>
                  Télécharger .md
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPanelOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <Markdown content={doc} />
            </div>
          </div>
        </div>
      )}
    </>,
    portalRef.current,
  );
}
