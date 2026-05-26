// TimeToCash — "Time to Cash" widget for LP dashboard.
// Server Component (pure — no I/O, no side effects beyond effectiveAsOf fallback).
// Non-negotiable #1: projected USDC shown as estimate (no guarantee).
// Non-negotiable #2: dual ProvenanceBadge Live (cycle) + Estimate (projected USDC).

import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import { computeTimeToCash } from "@/lib/data/time-to-cash";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TimeToCashProps {
  /** When the current monthly cycle started (typically 1st of month). */
  cycleStart: Date;
  /** Cycle length in days (typically 30). */
  cycleDays: number;
  /** Projected USDC amount based on current pool yield. */
  projectedUsdc: number;
  /** Pool current APR for the disclosure (e.g. 8.2). */
  currentAprPct: number;
  /** As-of timestamp. Defaults to new Date(). */
  asOf?: Date;
}

// ── Formatters ────────────────────────────────────────────────────────────────

const usdcFmt = new Intl.NumberFormat("en-US", {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: true,
});

function formatUsdc(amount: number): string {
  return usdcFmt.format(Math.round(amount));
}

function formatApr(pct: number): string {
  // Strip trailing ".0" only
  const fixed = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);
  return `${fixed}%`;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Time-to-Cash widget.
 *
 * Displays:
 *   - Countdown to next distribution (days + hours remaining)
 *   - Cycle progress bar with aria-progressbar semantics
 *   - Projected USDC amount (estimate, not a guarantee)
 *   - Dual provenance: Live (cycle clock) + Estimate (projected USDC)
 *
 * Non-negotiables honoured:
 *   #1  APY/APR always disclosed as a range context; projected amount is labelled estimate.
 *   #2  ProvenanceBadge present for both Live and Estimate signals.
 *   #5  No forbidden words — no "guarantee", "promise", "certain", "will deliver", "risk-free".
 *   #10 Assumptions + "not guaranteed" disclaimer visible.
 */
export function TimeToCash({
  cycleStart,
  cycleDays,
  projectedUsdc,
  currentAprPct,
  asOf,
}: TimeToCashProps) {
  const effectiveAsOf = asOf ?? new Date();

  const { daysElapsed, daysRemaining, hoursRemaining, progressPct } =
    computeTimeToCash({ cycleStart, cycleDays, asOf: effectiveAsOf });

  const progressRounded = Math.round(progressPct);

  const progressLabel = `Distribution cycle progress: ${progressRounded}% — Day ${daysElapsed} of ${cycleDays}. ${
    daysRemaining === 0 && hoursRemaining === 0
      ? "Distribution period reached."
      : `${daysRemaining}d ${hoursRemaining}h remaining.`
  }`;

  const countdownText =
    daysRemaining === 0 && hoursRemaining === 0
      ? "Distribution reached"
      : `~${usdcFmt.format(Math.round(projectedUsdc))} USDC in ${daysRemaining}d ${hoursRemaining}h`;

  return (
    <article
      className="ct-card flex flex-col gap-3"
      aria-label="Time to next distribution"
    >
      {/* Header row -------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow ct-text-muted tracking-[var(--ct-tracking-wide)] uppercase">
          TIME TO CASH
        </span>
        <div className="flex items-center gap-1.5">
          <ProvenanceBadge kind="live" />
          <ProvenanceBadge kind="estimated" />
        </div>
      </div>

      {/* Next distribution row --------------------------------------------- */}
      <div className="flex flex-col gap-0.5">
        <span className="body-xs ct-text-muted uppercase tracking-[var(--ct-tracking-wide)]">
          Next distribution
        </span>
        {/* Countdown — aria-live so JS can update it client-side if hydrated */}
        <p
          className={cn(
            "mono tabular-nums text-xl font-semibold leading-tight",
            daysRemaining === 0 && hoursRemaining === 0
              ? "ct-status-success"
              : "ct-text-primary",
          )}
          aria-live="polite"
          aria-atomic="true"
          style={{ color: "var(--ct-text-primary)", fontVariantNumeric: "tabular-nums" }}
        >
          {countdownText}
        </p>
      </div>

      {/* Progress bar ------------------------------------------------------ */}
      <div className="flex flex-col gap-1.5">
        <div
          role="progressbar"
          aria-valuenow={progressRounded}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={progressLabel}
          className="relative h-2 w-full overflow-hidden rounded-full"
          style={{ background: "var(--ct-surface-2)" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-[var(--ct-dur-base)]"
            style={{
              width: `${progressPct}%`,
              background: "var(--ct-accent)",
            }}
          />
        </div>

        {/* Day counter label */}
        <div className="flex items-center justify-between">
          <span
            className="body-xs tabular mono ct-text-muted"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            Day {daysElapsed} of {cycleDays}
          </span>
          <span
            className="body-xs tabular mono ct-text-muted"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {progressRounded}%
          </span>
        </div>
      </div>

      {/* Disclosure -------------------------------------------------------- */}
      <p
        className="body-xs italic"
        style={{ color: "var(--ct-text-faint)" }}
      >
        Projected from current pool yield {formatApr(currentAprPct)} APR.{" "}
        <span aria-label="Not guaranteed">Not guaranteed — estimate only.</span>
      </p>

      {/* Settings CTA ------------------------------------------------------ */}
      <div className="flex items-center justify-between border-t border-[var(--ct-border)] pt-2">
        <span className="body-xs ct-text-muted">
          {formatUsdc(projectedUsdc)} USDC projected
        </span>
        <button
          type="button"
          className="body-xs ct-text-muted flex items-center gap-1 hover:ct-text-primary transition-colors"
          aria-label="Open distribution notification settings"
        >
          Settings{" "}
          <span aria-hidden>→</span>
          <span className="sr-only">notify me 24h before</span>
        </button>
      </div>
    </article>
  );
}
