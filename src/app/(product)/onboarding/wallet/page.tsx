/**
 * S4 — Wallet binding page.
 *
 * Privy embedded wallet stub (P1 integration pending). Displays the placeholder
 * component and a "Continue" CTA that advances to the review step.
 * Non-negotiable #5: no forbidden words.
 */

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { WalletConnectPlaceholder } from "@/components/onboarding/WalletConnectPlaceholder";

export const dynamic = "force-dynamic";

export default function WalletPage() {
  return (
    <div className="ct-card w-full max-w-lg flex flex-col gap-[var(--ct-space-6)]">
      {/* Header */}
      <header className="flex flex-col gap-[var(--ct-space-2)]">
        <span className="eyebrow text-[var(--ct-accent)]" style={{ opacity: 0.8 }}>
          Step 4 of 7
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
          Connect Your Wallet
        </h1>
        <p className="body-sm ct-text-muted">
          Link the wallet address that will receive your USDC distributions.
          This wallet will also be the signing key for on-chain position management.
        </p>
      </header>

      {/* Privy stub */}
      <WalletConnectPlaceholder />

      {/* Navigation */}
      <div className="flex flex-col gap-[var(--ct-space-3)]">
        <Button variant="primary" size="lg" asChild className="w-full font-bold">
          <Link href="/onboarding/review?step=review">
            Continue to Review
          </Link>
        </Button>
        <Button variant="ghost" size="md" asChild className="w-full">
          <Link href="/onboarding/identity?step=identity">
            ← Back
          </Link>
        </Button>
      </div>

      <p className="body-xs ct-text-faint text-pretty">
        You can update your distribution wallet after onboarding via your Profile
        settings. Hearst Connect does not custody funds between deposit and vault
        allocation.
      </p>
    </div>
  );
}
