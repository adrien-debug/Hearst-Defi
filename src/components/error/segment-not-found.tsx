import Link from "next/link";

import { Button } from "@/components/ui/button";

interface SegmentNotFoundProps {
  /** Short eyebrow label, e.g. "Produit · 404". */
  scope: string;
  /** Sober explanatory copy. */
  message: string;
  /** Link target for the recovery action. */
  homeHref?: string;
  /** Link label for the recovery action. */
  homeLabel?: string;
}

/**
 * Shared 404 fallback for Next.js segment `not-found.tsx` boundaries.
 * Server Component — no client JS, Cockpit tokens only.
 */
export function SegmentNotFound({
  scope,
  message,
  homeHref = "/",
  homeLabel = "Retour à l'accueil",
}: SegmentNotFoundProps) {
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
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span className="eyebrow" style={{ color: "var(--ct-status-warning)" }}>
          {scope}
        </span>
        <h1 className="h2" style={{ margin: 0 }}>
          Page introuvable
        </h1>
      </header>

      <p className="body-md" style={{ margin: 0, color: "var(--ct-text-body)" }}>
        {message}
      </p>

      <div>
        <Button variant="secondary" size="sm" asChild>
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
