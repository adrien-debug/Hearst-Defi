import Link from "next/link";

import { ErrorShellLayout } from "@/components/error/error-shell";
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
    <ErrorShellLayout
      tone="warning"
      scope={scope}
      title="Page introuvable"
      message={message}
      actions={
        <Button variant="secondary" size="sm" asChild>
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      }
    />
  );
}
