"use client";

// PositionActions — Claim + Exit for /portfolio/[positionId]
// Client Component (kept client-side for the eventual interactive redemption flow).
// Non-negotiable #5: no forbidden words in copy.
//
// Pilot (testnet): claims and redemptions are processed by Investor Relations,
// subject to the 60-day soft lock-up — they are NOT self-served in-app. We do
// not render a button that would only simulate an on-chain transaction. A real
// on-chain redemption path ships post-audit; flip REDEMPTION_ENABLED then.

import type { PositionDetail } from "@/lib/data/portfolio";

/** Pilot flag — self-served claim/exit is disabled until a real on-chain path exists. */
const REDEMPTION_ENABLED = false;

interface PositionActionsProps {
  position: PositionDetail;
}

export function PositionActions({ position }: PositionActionsProps) {
  const isActive = position.status === "active";
  if (!isActive) return null;

  // Pilot: no self-served claim/exit. Surface an honest IR-routed notice
  // instead of a simulated button.
  if (!REDEMPTION_ENABLED) {
    return (
      <section aria-label="Position actions" className="flex flex-col gap-3">
        <p className="body-xs ct-text-muted">
          Claims and redemptions are processed by Investor Relations during the
          pilot, subject to the 60-day soft lock-up. Contact your IR
          representative to initiate a claim or exit.
        </p>
      </section>
    );
  }

  // Real self-served redemption UI ships post-audit.
  return null;
}
