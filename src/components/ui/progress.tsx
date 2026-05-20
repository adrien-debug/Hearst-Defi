import { cn } from "@/lib/cn";

interface ProgressProps {
  value: number;
  max?: number;
  /** Optional class applied to the fill bar (e.g. "bg-[--ct-status-danger]"). */
  fillClassName?: string;
  className?: string;
  /**
   * Accessible name for the progressbar. Screen readers announce
   * "<label>, X percent" instead of just the bare value. Pass the dimension
   * (e.g. "Liquidity risk score") so the value lands with context.
   */
  label?: string;
  /** Reference an existing visible label via id (alternative to `label`). */
  labelledBy?: string;
}

export function Progress({
  value,
  max = 100,
  fillClassName,
  className,
  label,
  labelledBy,
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-[--ct-radius-full] bg-[--ct-surface-2] shadow-inner backdrop-blur-sm",
        className,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      aria-labelledby={labelledBy}
    >
      <div
        className={cn(
          "h-full transition-[width] duration-[var(--ct-dur-slow)] ease-[var(--ct-ease)] relative",
          fillClassName ?? "bg-[--ct-text-strong]",
        )}
        style={{ width: `${pct}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[--ct-surface-3] to-transparent w-full h-full animate-[shimmer_2s_infinite]" />
      </div>
    </div>
  );
}
