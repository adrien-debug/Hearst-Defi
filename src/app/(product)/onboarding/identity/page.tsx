/**
 * S3 — Identity / KYC page.
 *
 * Persona iframe stub (P1 integration pending). Displays the placeholder
 * component and a "Continue" CTA that advances to the wallet step.
 * Non-negotiable #5: no forbidden words.
 */

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PersonaPlaceholder } from "@/components/onboarding/PersonaPlaceholder";

export const dynamic = "force-dynamic";

export default function IdentityPage() {
  return (
    <div className="ct-card w-full max-w-lg flex flex-col gap-[var(--ct-space-6)]">
      {/* Header */}
      <header className="flex flex-col gap-[var(--ct-space-2)]">
        <span className="eyebrow text-[var(--ct-accent)]" style={{ opacity: 0.8 }}>
          Step 3 of 7
        </span>
        <h1
          className="h1"
          style={{
            fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--ct-text-strong)",
          }}
        >
          Identity Verification
        </h1>
        <p className="body-sm ct-text-muted">
          AML / KYC verification is required prior to onboarding. The process
          takes approximately 3–5 minutes and requires a valid government-issued ID.
        </p>
      </header>

      {/* Persona stub */}
      <PersonaPlaceholder />

      {/* Navigation */}
      <div className="flex flex-col gap-[var(--ct-space-3)]">
        <Button variant="primary" size="lg" asChild className="w-full font-bold">
          <Link href="/onboarding/wallet?step=wallet">
            Continue to Wallet Binding
          </Link>
        </Button>
        <Button variant="ghost" size="md" asChild className="w-full">
          <Link href="/onboarding/accreditation?step=accreditation">
            ← Back
          </Link>
        </Button>
      </div>

      <p className="body-xs ct-text-faint text-pretty">
        KYC review typically completes within 24 hours. You will be notified by
        email once your identity has been verified.
      </p>
    </div>
  );
}
