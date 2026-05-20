"use client";

// InvestForm — Step 3 of 4: Deposit form with PTAI projection.
// Non-negotiable #1: APY always range.
// Non-negotiable #3: PTAI mandatory via <Ptai> primitive.
// Non-negotiable #5: no forbidden words — checked via linter in CI.
// Non-negotiable #10: "not guaranteed" disclaimer present.
// Design lock: .tabular on all numeric amounts, no new primitives.

import { useState, useCallback, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { Ptai } from "@/components/ui/ptai";
import { Button } from "@/components/ui/button";
import { DepositSummary } from "@/components/vaults/deposit-summary";
import { PreFlightCheck, isPreFlightReady } from "@/components/vaults/preflight-check";
import { TimeToTargetChart } from "@/components/vaults/time-to-target-chart";
import { stubDeposit, stubEpoch } from "@/lib/onchain";
import { monthsToTarget } from "@/lib/demo/projection";
import type { VaultProduct } from "@/lib/data/vaults";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUsd(n: number, compact = false): string {
  if (compact && n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`;
  }
  if (compact && n >= 1_000) {
    return `$${(n / 1_000).toFixed(0)}k`;
  }
  return `$${n.toLocaleString("en-US")}`;
}

// ---------------------------------------------------------------------------
// CTA label morph logic
// ---------------------------------------------------------------------------

type CtaState = "enter_amount" | "accept_terms" | "complete_preflight" | "confirming" | "ready";

function ctaLabel(state: CtaState, amount: number): string {
  switch (state) {
    case "enter_amount":
      return "Enter amount to confirm";
    case "accept_terms":
      return "Accept term sheet to continue";
    case "complete_preflight":
      return "Complete pre-flight check";
    case "confirming":
      return "Confirming…";
    case "ready":
      return amount > 0
        ? `Confirm deposit · ${formatUsd(amount)} →`
        : "Confirm deposit →";
  }
}

// ---------------------------------------------------------------------------
// PTAI content — mandatory (#3). No forbidden words (#5).
// ---------------------------------------------------------------------------

function buildPtai(
  amount: number,
  vault: VaultProduct,
): { projection: string; trigger: string; action: string; impact: string } {
  const midApy = (vault.apyLow + vault.apyHigh) / 2;
  const months10 = monthsToTarget(midApy, 10, 24);
  const months10Str = months10 !== null ? `~${months10} months` : "within 24 months";

  const annualYield =
    amount > 0 ? Math.round((amount * midApy) / 100) : null;

  return {
    projection:
      amount > 0
        ? `At ${formatUsd(amount)} principal you reach +10% cumulative yield in ${months10Str} under base assumptions.`
        : `Deposit at least ${formatUsd(vault.minTicketUsdc, true)} to see your personalized projection.`,

    trigger:
      `Hashprice ≥ $0.085/TH/day AND BTC ≥ $60,000 AND mining uptime ≥ 95% sustained over 30 days.`,

    action:
      `Monthly USDC distributions via Distribution.distributedAt on-chain event log. Rebalancing by rule-based triggers (Methodology v1.0).`,

    impact:
      annualYield !== null
        ? `Estimated ${formatUsd(annualYield)} annual yield — range ${vault.apyLow.toFixed(1)}–${vault.apyHigh.toFixed(1)}%. Results are not projected. Subject to assumptions — see methodology v1.0.`
        : `Target APY ${vault.apyLow.toFixed(1)}–${vault.apyHigh.toFixed(1)}%. Results are not projected. Subject to assumptions — see methodology v1.0.`,
  };
}

// ---------------------------------------------------------------------------
// InvestForm
// ---------------------------------------------------------------------------

interface InvestFormProps {
  vault: VaultProduct;
}

export function InvestForm({ vault }: InvestFormProps) {
  const router = useRouter();

  const maxAmount = vault.capacityUsdc - vault.currentAumUsdc;

  // Form state
  const [rawAmount, setRawAmount] = useState<string>("");
  const [agreedToTermSheet, setAgreedToTermSheet] = useState(false);
  const [allowanceApproved, setAllowanceApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [depositing, setDepositing] = useState(false);

  // MVP stub wallet — simulate connected wallet
  const STUB_WALLET = "0xABCDEF1234567890abcdef1234567890ABCDEF12";
  const walletAddress: string | null = STUB_WALLET;

  const amount = rawAmount === "" ? 0 : Math.max(0, Number(rawAmount.replace(/,/g, "")));
  const deferredAmount = useDeferredValue(amount);

  // Validity
  const amountValid = amount >= vault.minTicketUsdc && amount <= maxAmount;
  const preFlightOk = isPreFlightReady(walletAddress, allowanceApproved, stubEpoch());

  // CTA gating
  function ctaState(): CtaState {
    if (depositing) return "confirming";
    if (!amountValid) return "enter_amount";
    if (!agreedToTermSheet) return "accept_terms";
    if (!preFlightOk) return "complete_preflight";
    return "ready";
  }

  const currentCtaState = ctaState();
  const ctaEnabled = currentCtaState === "ready";

  // Helper text for the amount input
  function amountHelperText(): { text: string; variant: "ok" | "warn" | "neutral" } {
    if (amount === 0) {
      return {
        text: `Minimum ${formatUsd(vault.minTicketUsdc, true)} · Capacity remaining: ${formatUsd(maxAmount, true)}`,
        variant: "neutral",
      };
    }
    if (amount < vault.minTicketUsdc) {
      return {
        text: `Below minimum of ${formatUsd(vault.minTicketUsdc, true)}`,
        variant: "warn",
      };
    }
    if (amount > maxAmount) {
      return {
        text: `Exceeds available capacity (${formatUsd(maxAmount, true)} remaining)`,
        variant: "warn",
      };
    }
    return { text: `Amount valid · ${formatUsd(amount)} USDC`, variant: "ok" };
  }

  const helper = amountHelperText();

  // Confirm deposit
  const handleConfirm = useCallback(async () => {
    if (!ctaEnabled || depositing) return;
    setDepositing(true);
    try {
      const result = await stubDeposit({ vault, amount });
      router.push(`/vaults/${vault.id}/invest/confirmed?tx=${result.txHash}&amount=${amount}`);
    } finally {
      setDepositing(false);
    }
  }, [ctaEnabled, depositing, vault, amount, router]);

  const ptai = buildPtai(deferredAmount, vault);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">
      {/* ── LEFT COLUMN ──────────────────────────────── */}
      <div className="flex flex-col gap-5">
        {/* Amount input */}
        <section aria-labelledby="amt-label">
          <label id="amt-label" className="eyebrow block mb-2">
            Amount (USDC)
          </label>

          <div className="relative">
            <span
              aria-hidden
              className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-semibold ct-text-muted select-none"
            >
              $
            </span>
            <input
              type="number"
              min={vault.minTicketUsdc}
              max={maxAmount}
              step={1000}
              value={rawAmount}
              onChange={(e) => {
                setRawAmount(e.target.value);
                // Reset allowance when amount changes
                setAllowanceApproved(false);
              }}
              placeholder={vault.minTicketUsdc.toLocaleString("en-US")}
              aria-describedby="amt-helper"
              aria-invalid={amount > 0 && !amountValid}
              className={cn(
                "ct-input tabular w-full pl-8 pr-4 py-3 font-mono text-lg",
                amount > 0 && !amountValid
                  ? "border-[--ct-status-warning-border] focus:ring-[--ct-status-warning]"
                  : "",
              )}
            />
          </div>

          <p
            id="amt-helper"
            className={cn(
              "body-xs mt-1.5",
              helper.variant === "ok" && "ct-status-success",
              helper.variant === "warn" && "ct-status-warning",
              helper.variant === "neutral" && "ct-text-muted",
            )}
          >
            {helper.text}
          </p>
        </section>

        {/* Term sheet checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <span className="mt-0.5 relative shrink-0">
            <input
              type="checkbox"
              checked={agreedToTermSheet}
              onChange={(e) => setAgreedToTermSheet(e.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded border transition-colors",
                agreedToTermSheet
                  ? "bg-[--ct-accent] border-[--ct-border-accent]"
                  : "bg-[--ct-surface-1] border-[--ct-border-soft] group-hover:border-[--ct-border-strong]",
              )}
            >
              {agreedToTermSheet && (
                <svg
                  width="11"
                  height="9"
                  viewBox="0 0 11 9"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 4.5L4 7.5L10 1.5"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </span>
          <span className="body-sm ct-text-body">
            I have reviewed and accept the{" "}
            <Link
              href={`/vaults/${vault.id}`}
              className="underline ct-text-primary hover:ct-text-strong transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              term sheet
            </Link>{" "}
            for {vault.name}. I understand this is a structured product offered
            exclusively to qualified investors.
          </span>
        </label>

        {/* CTA row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="secondary"
            size="md"
            asChild
          >
            <Link href={`/vaults/${vault.id}`}>← Back</Link>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={!ctaEnabled}
            aria-disabled={!ctaEnabled}
            className={cn(
              "font-bold flex-1",
              !ctaEnabled && "opacity-60 cursor-not-allowed",
            )}
          >
            {ctaLabel(currentCtaState, amount)}
          </Button>
        </div>

        {/* Time-to-target chart — only when amount is set */}
        {deferredAmount > 0 && (
          <div className="ct-card mt-1">
            <p className="eyebrow mb-3">Projected NAV — 24 month horizon</p>
            <TimeToTargetChart amount={deferredAmount} vault={vault} />
          </div>
        )}

        {/* PTAI block — mandatory (#3) */}
        <div>
          <p className="eyebrow mb-2">Projection (PTAI)</p>
          <Ptai
            projection={ptai.projection}
            trigger={ptai.trigger}
            action={ptai.action}
            impact={ptai.impact}
          />
        </div>
      </div>

      {/* ── RIGHT COLUMN ─────────────────────────────── */}
      <div className="flex flex-col gap-5">
        {/* Deposit summary */}
        <DepositSummary vault={vault} amount={deferredAmount} />

        {/* Pre-flight check */}
        <PreFlightCheck
          walletAddress={walletAddress}
          amount={deferredAmount}
          vaultId={vault.id}
          onAllowanceApproved={() => setAllowanceApproved(true)}
          allowanceApproved={allowanceApproved}
          approving={approving}
          onApproveStart={() => setApproving(true)}
          onApproveEnd={() => setApproving(false)}
        />
      </div>
    </div>
  );
}
