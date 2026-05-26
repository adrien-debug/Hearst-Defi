"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { atomicExecAction } from "./atomic-exec-action";
import type { AtomicExecResult } from "@/lib/distribution/atomic-exec";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AtomicExecButtonProps {
  distributionId: string;
  /** Human-readable amount, e.g. "$1.2M". */
  amountLabel: string;
  /** Estimated recipient count from distribution.recipientsCount. */
  recipientsCount: number;
  disabled?: boolean;
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// AtomicExecButton
// ---------------------------------------------------------------------------

export function AtomicExecButton({
  distributionId,
  amountLabel,
  recipientsCount,
  disabled = false,
  children,
}: AtomicExecButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<
    "idle" | "confirm" | "executing" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtomicExecResult | null>(null);
  const [progress, setProgress] = useState(0);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleOpenConfirm() {
    setPhase("confirm");
  }

  function handleCancel() {
    setPhase("idle");
    setError(null);
  }

  function handleConfirm() {
    setPhase("executing");
    setError(null);
    setProgress(0);

    // Synthetic progress animation while the server action runs
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 12, 85));
    }, 300);

    startTransition(async () => {
      const response = await atomicExecAction(distributionId);
      clearInterval(interval);

      if (response.success) {
        setProgress(100);
        setResult(response.result);
        setPhase("done");
      } else {
        setProgress(0);
        setError(response.error);
        setPhase("error");
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Trigger button */}
      {phase === "idle" && (
        <Button
          variant="primary"
          onClick={handleOpenConfirm}
          disabled={disabled || isPending}
        >
          {children ?? "Execute distribution (atomic)"}
        </Button>
      )}

      {/* Confirmation modal */}
      {phase === "confirm" && (
        <Card className="space-y-4 border border-[var(--ct-accent)] border-opacity-30">
          <p className="eyebrow ct-text-accent">Confirm atomic execution</p>

          <div className="space-y-2">
            <p className="body-sm ct-text-body font-semibold">
              Execute distribution {amountLabel} to {recipientsCount} LPs?
            </p>

            <ul className="space-y-1 body-xs ct-text-muted list-none pl-0">
              <li className="flex items-start gap-2">
                <span className="ct-text-accent mt-0.5">•</span>
                <span>Send on-chain tx (mock for now)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="ct-text-accent mt-0.5">•</span>
                <span>
                  Generate ledger entries ({recipientsCount})
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="ct-text-accent mt-0.5">•</span>
                <span>Generate PCAP PDF</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="ct-text-accent mt-0.5">•</span>
                <span>Send notification emails</span>
              </li>
            </ul>

            <p className="body-xs ct-text-faint mt-2">
              All atomic — if any step fails, none commits.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1"
            >
              Confirm execute
            </Button>
          </div>
        </Card>
      )}

      {/* Executing state — progress bar */}
      {phase === "executing" && (
        <Card className="space-y-3">
          <p className="body-sm ct-text-muted">Executing distribution…</p>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-1.5 rounded-full bg-[var(--ct-surface-2)] overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-[var(--ct-accent)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="body-xs ct-text-faint">{progress}%</p>
        </Card>
      )}

      {/* Error state */}
      {phase === "error" && (
        <div className="space-y-2">
          <div className="ct-status-danger-bg px-3 py-2 rounded-[var(--ct-radius-lg)]">
            <p className="body-xs ct-status-danger font-medium">
              Execution failed
            </p>
            {error && (
              <p className="body-xs ct-text-muted mt-0.5">{error}</p>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setPhase("idle");
              setError(null);
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Done state */}
      {phase === "done" && result && (
        <div className="ct-status-success-bg px-4 py-3 rounded-[var(--ct-radius-xl)] space-y-2">
          <p className="body-sm ct-status-success font-semibold">
            Distribution executed atomically
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="body-xs ct-text-muted">Tx hash</span>
            <span className="body-xs mono ct-text-body truncate">
              {result.tx.hash.slice(0, 18)}…
            </span>
            <span className="body-xs ct-text-muted">Ledger entries</span>
            <span className="body-xs tabular ct-text-body">
              {result.ledgerEntries.length}
            </span>
            <span className="body-xs ct-text-muted">PCAP</span>
            <span className="body-xs ct-text-body">Generated</span>
            <span className="body-xs ct-text-muted">Emails queued</span>
            <span className="body-xs tabular ct-text-body">
              {result.emailsQueued}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
