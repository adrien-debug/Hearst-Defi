import { cn } from "@/lib/cn";

interface ProgressProps {
  value: number;
  max?: number;
  /** Optional class applied to the fill bar (e.g. "bg-[--color-danger]"). */
  fillClassName?: string;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  fillClassName,
  className,
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-[--color-bg-elevated]",
        className,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn(
          "h-full transition-[width] duration-300",
          fillClassName ?? "bg-[--color-brand]",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
