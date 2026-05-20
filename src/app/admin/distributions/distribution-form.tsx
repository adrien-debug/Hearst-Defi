"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { DistributionPreview } from "@/components/admin/distribution-preview";
import {
  computeDistribution,
  confirmDistribution,
  type ComputeDistributionResult,
} from "./actions";

// ---------------------------------------------------------------------------
// getCurrentPeriod — default to current YYYY-MM
// ---------------------------------------------------------------------------

function getCurrentPeriod(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ---------------------------------------------------------------------------
// DistributionForm
// ---------------------------------------------------------------------------

export function DistributionForm() {
  const [isPending, startTransition] = useTransition();
  const [period, setPeriod] = useState(getCurrentPeriod);
  const [totalUsdc, setTotalUsdc] = useState("");
  const [preview, setPreview] = useState<ComputeDistributionResult | null>(
    null,
  );
  const [signerWallet, setSignerWallet] = useState("");
  const [confirmResult, setConfirmResult] = useState<{
    confirmed: boolean;
    signersCount: number;
    required: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalUsdcNum = parseFloat(totalUsdc);

  function handleCompute() {
    if (!period.match(/^\d{4}-\d{2}$/)) {
      setError("Period must be in YYYY-MM format.");
      return;
    }
    if (isNaN(totalUsdcNum) || totalUsdcNum <= 0) {
      setError("Total USDC must be a positive number.");
      return;
    }
    setError(null);
    setPreview(null);
    setConfirmResult(null);

    startTransition(async () => {
      try {
        const result = await computeDistribution(period, totalUsdcNum);
        setPreview(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Compute failed.");
      }
    });
  }

  function handleConfirm() {
    if (!signerWallet.trim()) {
      setError("Signer wallet is required to confirm.");
      return;
    }
    if (!preview) {
      setError("Run compute first.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const result = await confirmDistribution(
          period,
          signerWallet.trim(),
          totalUsdcNum,
        );
        setConfirmResult(result);
        if (result.confirmed) {
          setPreview(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Confirm failed.");
      }
    });
  }

  return (
    <div className="ct-card space-y-6">
      <div className="space-y-1">
        <h2 className="h3">Compute next distribution</h2>
        <p className="body-sm ct-text-muted">
          Dry-run computes pro-rata payouts from active positions. No DB writes
          until multisig confirmation.
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="stat-label" htmlFor="dist-period">
            Period (YYYY-MM)
          </label>
          <input
            id="dist-period"
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2026-05"
            className="ct-input w-full mono"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1">
          <label className="stat-label" htmlFor="dist-usdc">
            Total USDC
          </label>
          <input
            id="dist-usdc"
            type="number"
            value={totalUsdc}
            onChange={(e) => setTotalUsdc(e.target.value)}
            placeholder="50000"
            min={0}
            step={0.01}
            className="ct-input w-full tabular"
            disabled={isPending}
          />
        </div>
      </div>

      <Button
        variant="secondary"
        onClick={handleCompute}
        disabled={isPending || !period || !totalUsdc}
      >
        {isPending && !preview ? "Computing…" : "Compute"}
      </Button>

      {/* Error */}
      {error && (
        <p className="body-xs ct-status-danger-bg px-3 py-2 rounded-[--ct-radius-lg]">
          {error}
        </p>
      )}

      {/* Preview */}
      {preview && (
        <>
          <DistributionPreview
            period={preview.period}
            totalUsdc={preview.totalUsdc}
            recipients={preview.recipients}
          />

          {/* Multisig confirm */}
          {preview.recipients.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="stat-label" htmlFor="dist-signer">
                  Your signer wallet
                </label>
                <input
                  id="dist-signer"
                  type="text"
                  value={signerWallet}
                  onChange={(e) => setSignerWallet(e.target.value)}
                  placeholder="0x…"
                  className="ct-input w-full mono"
                  disabled={isPending}
                />
              </div>

              {confirmResult && !confirmResult.confirmed && (
                <p className="body-xs ct-status-info-bg px-3 py-2 rounded-[--ct-radius-lg]">
                  Signature {confirmResult.signersCount}/{confirmResult.required}{" "}
                  recorded. Awaiting {confirmResult.required - confirmResult.signersCount} more
                  distinct signer(s).
                </p>
              )}

              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isPending || !signerWallet.trim()}
              >
                {isPending
                  ? "Confirming…"
                  : "Confirm distribution (multisig)"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Confirmed */}
      {confirmResult?.confirmed && (
        <div className="ct-status-success-bg px-4 py-3 rounded-[--ct-radius-xl] space-y-1">
          <p className="body-sm ct-status-success font-semibold">
            Distribution confirmed for period {period}.
          </p>
          <p className="body-xs ct-text-muted">
            Distribution row and investor transactions have been created. Reload
            the page to see the updated history.
          </p>
        </div>
      )}
    </div>
  );
}
