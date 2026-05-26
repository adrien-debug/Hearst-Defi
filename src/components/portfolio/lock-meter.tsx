// LockMeter — Lock / Liquidity progress widget for LP dashboard.
// Server Component (pure — no I/O, no side effects).
// Non-negotiable #2: ProvenanceBadge kind="live" (CLAUDE.md).

import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";

// ── Internal helpers (exported for unit tests) ────────────────────────────────

/** Clamp a value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Format basis-points as a locale percentage string, e.g. 150 → "1.5%". */
export function formatBps(bps: number): string {
  const pct = bps / 100;
  // Avoid trailing zeros only when they are irrelevant (e.g. 200bps → "2%").
  const formatted = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);
  return `${formatted}%`;
}

/** All derived values from the lock-meter calculation. */
export interface LockMeterCalc {
  daysElapsed: number;
  progressPct: number;
  unlockDate: Date;
  daysRemaining: number;
  isUnlocked: boolean;
}

/** Pure calculation — no Date.now(), only the injected `asOf` param. */
export function computeLockMeter(
  lockStart: Date,
  softLockupDays: number,
  asOf: Date,
): LockMeterCalc {
  const MS_PER_DAY = 86_400_000;
  const daysElapsed = Math.floor(
    (asOf.getTime() - lockStart.getTime()) / MS_PER_DAY,
  );
  const progressPct = clamp((daysElapsed / softLockupDays) * 100, 0, 100);
  const unlockDate = new Date(lockStart.getTime() + softLockupDays * MS_PER_DAY);
  const daysRemaining = Math.max(0, softLockupDays - daysElapsed);
  const isUnlocked = daysRemaining === 0;

  return { daysElapsed, progressPct, unlockDate, daysRemaining, isUnlocked };
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface LockMeterProps {
  /** Date the lockup started (typically tx confirmation). */
  lockStart: Date;
  /** Soft-lockup duration in days (e.g. 60 for class A). */
  softLockupDays: number;
  /** Early-exit penalty in basis points (e.g. 150 = 1.5%). */
  earlyExitPenaltyBps?: number;
  /** As-of timestamp for the rendering (server time). Defaults to new Date(). */
  asOf?: Date;
}

const unlockDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * Lock · Liquidity meter widget.
 *
 * Displays the lockup progress for a vault position:
 *   - Progress bar with aria-progressbar semantics
 *   - Unlock date + days remaining
 *   - Early-exit penalty (when applicable)
 *   - ProvenanceBadge "live" top-right (CLAUDE.md non-negotiable #2)
 */
export function LockMeter({
  lockStart,
  softLockupDays,
  earlyExitPenaltyBps,
  asOf,
}: LockMeterProps) {
  const effectiveAsOf = asOf ?? new Date();
  const { progressPct, unlockDate, daysRemaining, isUnlocked } =
    computeLockMeter(lockStart, softLockupDays, effectiveAsOf);

  // Bar fill: green accent when in progress, status-success when fully unlocked.
  const barFill = isUnlocked
    ? "var(--ct-status-success)"
    : "var(--ct-accent)";

  // Penalty text color: faint when more than 50% elapsed (less urgent),
  // warning when less than 50% elapsed (early-exit risk is high).
  const penaltyHalfPassed = progressPct >= 50;

  const progressLabel = `Lockup progress: ${Math.floor(progressPct)}% — ${
    isUnlocked
      ? "fully unlocked"
      : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining of ${softLockupDays}`
  }`;

  return (
    <article
      className="ct-card flex flex-col gap-3"
      aria-label="Lock and liquidity status"
    >
      {/* Header row -------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow ct-text-muted tracking-[var(--ct-tracking-wide)] uppercase">
          LOCK · LIQUIDITY
        </span>
        <ProvenanceBadge kind="live" />
      </div>

      {/* Progress bar ------------------------------------------------------ */}
      <div className="flex flex-col gap-1.5">
        {/* Bar */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
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
              background: barFill,
            }}
          />
        </div>

        {/* Percentage label */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "body-xs tabular mono",
              isUnlocked ? "ct-status-success" : "ct-text-primary",
            )}
          >
            {Math.round(progressPct)}%
          </span>
          {!isUnlocked && (
            <span className="body-xs tabular mono ct-text-muted">
              {daysRemaining}d left
            </span>
          )}
        </div>
      </div>

      {/* Metadata ---------------------------------------------------------- */}
      <dl className="flex flex-col gap-1">
        {/* Unlock date */}
        <div className="flex items-center justify-between gap-2">
          <dt className="body-xs ct-text-muted">
            {isUnlocked ? "Unlocked" : "Unlock"}
          </dt>
          <dd
            className={cn(
              "body-xs tabular mono m-0",
              isUnlocked ? "ct-status-success" : "ct-text-primary",
            )}
          >
            {isUnlocked ? "Now" : unlockDateFmt.format(unlockDate)}
          </dd>
        </div>

        {/* Early-exit penalty (only shown when still locked) */}
        {!isUnlocked && earlyExitPenaltyBps !== undefined && (
          <div className="flex items-center justify-between gap-2">
            <dt className="body-xs ct-text-muted">Penalty</dt>
            <dd
              className={cn(
                "body-xs tabular mono m-0",
                penaltyHalfPassed ? "ct-text-faint" : "ct-status-warning",
              )}
            >
              {formatBps(earlyExitPenaltyBps)}{" "}
              <span className="ct-text-faint">(early exit)</span>
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}
