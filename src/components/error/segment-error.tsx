"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface SegmentErrorProps {
  /** Error object provided by the Next.js error boundary. */
  error: Error & { digest?: string };
  /** Resets the error boundary and re-renders the segment. */
  reset: () => void;
  /** Short eyebrow label, e.g. "Dashboard · Erreur". */
  scope: string;
  /** Optional "back" link target (defaults to product home). */
  homeHref?: string;
  /** Optional "back" link label. */
  homeLabel?: string;
}

/**
 * Shared client fallback for Next.js segment `error.tsx` boundaries across the
 * Hearst Connect product shell. Sober copy, no raw stack leaked to the user,
 * only the opaque `digest` is surfaced for support correlation.
 */
export function SegmentError({
  error,
  reset,
  scope,
  homeHref = "/",
  homeLabel = "Retour à l'accueil",
}: SegmentErrorProps) {
  useEffect(() => {
    // Local diagnostics only; production capture handled upstream (Sentry).
    console.error(`[${scope}] uncaught error`, error);
  }, [error, scope]);

  return (
    <div
      className="glass-panel"
      style={{
        margin: "2.5rem auto",
        maxWidth: "42rem",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
      role="alert"
      aria-live="assertive"
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span className="eyebrow" style={{ color: "var(--ct-status-danger)" }}>
          {scope}
        </span>
        <h1 className="h2" style={{ margin: 0 }}>
          Une erreur est survenue
        </h1>
      </header>

      <p className="body-md" style={{ margin: 0, color: "var(--ct-text-body)" }}>
        Un incident inattendu a interrompu cette page. Vous pouvez réessayer ;
        si le problème persiste, contactez le support.
      </p>

      {error.digest ? (
        <p className="body-xs" style={{ margin: 0, color: "var(--ct-text-muted)" }}>
          Référence&nbsp;: <span className="mono">{error.digest}</span>
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.75rem",
          marginTop: "0.25rem",
        }}
      >
        <Button variant="primary" size="sm" onClick={() => reset()}>
          Réessayer
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
