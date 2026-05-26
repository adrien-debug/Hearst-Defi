"use client";

/**
 * ShareClassPicker — toggle switcher between Class A and Class B.
 *
 * Displays both classes with their key terms so the investor can make an
 * informed choice before subscribing. Calls `onChange` with the selected
 * class code so the parent subscription form can apply the correct constraints.
 *
 * Cockpit tokens throughout (--ct-*). No forbidden words. No hardcoded hex.
 */

import { cn } from "@/lib/cn";
import { SHARE_CLASS_A, SHARE_CLASS_B } from "@/lib/engine/share-class";
import type { ShareClassCode } from "@/app/actions/subscribe";

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 0,
});

const CLASSES = [
  {
    code: "A" as ShareClassCode,
    terms: SHARE_CLASS_A,
    label: "Class A",
    tagline: "Institutional entry",
  },
  {
    code: "B" as ShareClassCode,
    terms: SHARE_CLASS_B,
    label: "Class B",
    tagline: "Premier terms",
  },
] as const;

interface ShareClassPickerProps {
  value: ShareClassCode;
  onChange: (code: ShareClassCode) => void;
  disabled?: boolean;
}

/**
 * Accessible dual-option switcher.
 *
 * Each card shows: class label, min ticket, lockup, management fee and
 * performance fee. The selected card gets the accent ring.
 */
export function ShareClassPicker({
  value,
  onChange,
  disabled = false,
}: ShareClassPickerProps) {
  return (
    <fieldset
      className="flex gap-3 flex-wrap"
      aria-label="Share class"
      disabled={disabled}
    >
      <legend className="sr-only">Select share class</legend>
      {CLASSES.map(({ code, terms, label, tagline }) => {
        const selected = value === code;
        return (
          <label
            key={code}
            className={cn(
              "relative flex flex-col gap-1.5 px-4 py-3 rounded-[var(--ct-radius-md)] cursor-pointer",
              "border transition-all duration-150",
              "min-w-[160px] flex-1",
              selected
                ? "border-[var(--ct-accent)] bg-[var(--ct-surface-2)]"
                : "border-[var(--ct-border)] bg-[var(--ct-surface-1)] hover:border-[var(--ct-border-strong)]",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name="shareClass"
              value={code}
              checked={selected}
              onChange={() => onChange(code)}
              disabled={disabled}
              className="sr-only"
              aria-label={label}
            />

            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "body-sm font-semibold",
                  selected ? "ct-text-strong" : "text-[var(--ct-text-primary)]",
                )}
              >
                {label}
              </span>
              {selected && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: "var(--ct-accent)" }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Tagline */}
            <span className="body-xs text-[var(--ct-text-muted)]">{tagline}</span>

            {/* Key terms */}
            <dl className="mt-1 flex flex-col gap-0.5">
              <div className="flex justify-between gap-2 body-xs">
                <dt className="text-[var(--ct-text-muted)]">Min ticket</dt>
                <dd className="tabular text-[var(--ct-text-body)] font-medium">
                  {usdCompact.format(terms.minTicketUsdc)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 body-xs">
                <dt className="text-[var(--ct-text-muted)]">Lock-up</dt>
                <dd className="tabular text-[var(--ct-text-body)] font-medium">
                  {terms.softLockupDays}d soft
                </dd>
              </div>
              <div className="flex justify-between gap-2 body-xs">
                <dt className="text-[var(--ct-text-muted)]">Mgmt fee</dt>
                <dd className="tabular text-[var(--ct-text-body)] font-medium">
                  {(terms.mgmtFeeBps / 100).toFixed(2)}%
                </dd>
              </div>
              <div className="flex justify-between gap-2 body-xs">
                <dt className="text-[var(--ct-text-muted)]">Carry</dt>
                <dd className="tabular text-[var(--ct-text-body)] font-medium">
                  {(terms.perfFeeBps / 100).toFixed(0)}%
                </dd>
              </div>
            </dl>
          </label>
        );
      })}
    </fieldset>
  );
}
