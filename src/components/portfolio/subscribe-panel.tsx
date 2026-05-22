"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";
import { ApyRange } from "@/components/ui/apy-range";
import { Button } from "@/components/ui/button";
import { subscribe } from "@/app/actions/subscribe";
import type { VaultProduct } from "@/lib/data/vaults";

function formatUsd(n: number, compact = false): string {
  if (compact && n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (compact && n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toLocaleString("en-US")}`;
}

interface SubscribePanelProps {
  vaults: VaultProduct[];
  /** Called when the user cancels — returns to the portfolio cockpit. */
  onCancel: () => void;
}

/**
 * In-cockpit subscription panel — replaces the portfolio's Section 2.
 *
 * Step A: pick a vault (cards). Step B: enter amount + accept term sheet +
 * confirm → DB position via the `subscribe` Server Action → router.refresh()
 * brings the user back to a filled portfolio. APY always shown as a range (#1);
 * mandatory "not guaranteed" disclaimer (#10); no forbidden words (#5).
 */
export function SubscribePanel({ vaults, onCancel }: SubscribePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [selected, setSelected] = useState<VaultProduct | null>(
    vaults.length === 1 ? (vaults[0] ?? null) : null,
  );
  const [rawAmount, setRawAmount] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount =
    rawAmount === "" ? 0 : Math.max(0, Number(rawAmount.replace(/,/g, "")));
  const remaining = selected
    ? selected.capacityUsdc - selected.currentAumUsdc
    : 0;
  const amountValid =
    !!selected && amount >= selected.minTicketUsdc && amount <= remaining;
  const canConfirm = amountValid && agreed && !pending;

  function handleConfirm() {
    if (!selected || !canConfirm) return;
    setError(null);
    startTransition(async () => {
      const res = await subscribe(selected.id, amount);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Position written — refresh server data and drop back to the cockpit.
      router.refresh();
      onCancel();
    });
  }

  return (
    <article className="dash-cell" aria-label="Subscribe to a vault">
      <div className="dash-label">
        <span>{selected ? "Subscribe" : "Select a vault"}</span>
        <button type="button" className="pf-vault-viewall" onClick={onCancel}>
          ✕ Cancel
        </button>
      </div>

      {/* Step A — vault selection */}
      {!selected && (
        <div className="pf-vault-list">
          {vaults.map((v) => (
            <button
              key={v.id}
              type="button"
              className="pf-vault-card text-left w-full"
              onClick={() => setSelected(v)}
            >
              <span className="pf-vault-accent" aria-hidden="true" />
              <div className="pf-vault-body">
                <span className="pf-vault-name">{v.name}</span>
                <span className="pf-vault-meta">
                  <span className="pf-vault-dot" aria-hidden="true" />
                  Min {formatUsd(v.minTicketUsdc, true)}
                  <span className="pf-vault-sep" aria-hidden="true">·</span>
                  {v.softLockupDays}-day lock-up
                </span>
              </div>
              <div className="pf-vault-apy">
                <ApyRange low={v.apyLow} high={v.apyHigh} precision={1} />
                <span className="pf-vault-apy-lbl">Target APY</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step B — amount + confirm */}
      {selected && (
        <div className="pf-subscribe-form">
          <div className="pf-subscribe-vault">
            <span className="pf-vault-name">{selected.name}</span>
            <ApyRange low={selected.apyLow} high={selected.apyHigh} precision={1} />
          </div>

          <label className="eyebrow block">Amount (USDC)</label>
          <div className="relative">
            <span
              aria-hidden
              className="absolute left-4 top-1/2 -translate-y-1/2 mono font-semibold ct-text-muted select-none"
            >
              $
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={selected.minTicketUsdc}
              max={remaining}
              step={1000}
              value={rawAmount}
              onChange={(e) => {
                const v = e.target.value;
                // Only allow non-negative integers (no e, no decimals, no negatives).
                if (v === "" || /^\d+$/.test(v)) setRawAmount(v);
              }}
              onKeyDown={(e) => {
                if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
              }}
              placeholder={selected.minTicketUsdc.toLocaleString("en-US")}
              aria-invalid={amount > 0 && !amountValid}
              className={cn(
                "ct-input tabular w-full pl-8 pr-4 py-3 mono text-lg",
                amount > 0 && !amountValid &&
                  "border-[--ct-status-warning-border]",
              )}
            />
          </div>
          <p className="body-xs ct-text-muted">
            Minimum {formatUsd(selected.minTicketUsdc, true)} · Capacity remaining{" "}
            {formatUsd(remaining, true)}
          </p>

          <label className="flex items-start gap-3 cursor-pointer group mt-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 shrink-0"
            />
            <span className="body-sm ct-text-body">
              I have reviewed and accept the term sheet for {selected.name}. I
              understand this is a structured product for qualified investors and
              that target APY ranges are not guaranteed.
            </span>
          </label>

          {error && (
            <p className="body-xs ct-status-danger px-3 py-2 rounded-[--ct-radius-lg] border border-[--ct-status-danger-border] ct-surface-1">
              {error}
            </p>
          )}

          <div className="flex gap-2 flex-wrap mt-1">
            {vaults.length > 1 && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setSelected(null)}
                disabled={pending}
              >
                ← Back
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="font-bold flex-1"
            >
              {pending
                ? "Confirming…"
                : amount > 0
                  ? `Confirm ${formatUsd(amount)} deposit`
                  : "Enter amount to confirm"}
            </Button>
          </div>

          <p className="body-xs ct-text-muted italic mt-1">
            Subject to {selected.softLockupDays}-day soft lock-up. Results are not
            projected — see Methodology v1.0. APY ranges are not guaranteed.
          </p>
        </div>
      )}
    </article>
  );
}
