"use client";

// PositionActions — Claim + Exit stubs for /portfolio/[positionId]
// Client Component (interactivity required for toasts + confirm dialog).
// Non-negotiable #5: no forbidden words in copy.
// Stubs: useClaim / useExit mock success after 800ms — no real onchain call at MVP.

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PositionDetail } from "@/lib/data/portfolio";

const usdFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Stub: simulate a claim transaction (800ms delay). */
async function stubClaim(_positionId: string): Promise<{ txHash: string }> {
  await new Promise((r) => setTimeout(r, 800));
  return { txHash: "0xmock_claim_" + Math.random().toString(16).slice(2, 10) };
}

/** Stub: simulate an exit transaction (800ms delay). */
async function stubExit(_positionId: string): Promise<{ txHash: string }> {
  await new Promise((r) => setTimeout(r, 800));
  return { txHash: "0xmock_exit_" + Math.random().toString(16).slice(2, 10) };
}

interface PositionActionsProps {
  position: PositionDetail;
}

/**
 * Claim and Exit action buttons.
 *
 * Claim: visible when accruedYieldUsdc > 0 and position is active.
 * Exit:  visible when position is active (soft lock-up enforcement is
 *        server-side in Phase 2; MVP shows the button for any active position).
 *
 * Exit confirmation uses the canonical <ConfirmDialog> primitive.
 */
export function PositionActions({ position }: PositionActionsProps) {
  const [claiming, setClaiming] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const isActive = position.status === "active";
  const hasClaim = isActive && position.accruedYieldUsdc > 0;

  async function handleClaim() {
    if (!hasClaim || claiming) return;
    setClaiming(true);
    try {
      const result = await stubClaim(position.id);
      toast.success(
        `Claimed ${usdFull.format(position.accruedYieldUsdc)} USDC`,
        {
          description: `Tx: ${result.txHash.slice(0, 12)}…`,
          duration: 6000,
        },
      );
    } catch {
      toast.error("Claim failed", {
        description: "Please try again or contact support.",
      });
    } finally {
      setClaiming(false);
    }
  }

  async function handleExitConfirmed() {
    if (!isActive || exiting) return;
    setExiting(true);
    try {
      const result = await stubExit(position.id);
      toast.success("Exit initiated", {
        description: `Tx: ${result.txHash.slice(0, 12)}… — settlement in progress.`,
        duration: 8000,
      });
    } catch {
      toast.error("Exit failed", {
        description: "Please try again or contact support.",
      });
    } finally {
      setExiting(false);
    }
  }

  if (!isActive) return null;

  return (
    <section aria-label="Position actions" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {hasClaim && (
          <Button
            variant="primary"
            size="md"
            onClick={handleClaim}
            disabled={claiming}
            aria-busy={claiming}
          >
            {claiming
              ? "Claiming…"
              : `Claim ${usdFull.format(position.accruedYieldUsdc)}`}
          </Button>
        )}

        <Button
          variant="danger"
          size="md"
          onClick={() => setConfirmExit(true)}
          disabled={exiting || confirmExit}
          aria-busy={exiting}
          aria-haspopup="dialog"
          aria-expanded={confirmExit}
        >
          {exiting ? "Exiting…" : "Exit position"}
        </Button>
      </div>

      {/* Exit confirmation — canonical ConfirmDialog primitive */}
      <ConfirmDialog
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Confirm exit"
        description="Your principal will be returned after the standard settlement period. This action cannot be undone."
        confirmLabel="Confirm exit"
        confirmVariant="danger"
        onConfirm={handleExitConfirmed}
      />
    </section>
  );
}
