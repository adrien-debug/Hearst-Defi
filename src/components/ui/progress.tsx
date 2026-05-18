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
        "h-1.5 w-full overflow-hidden rounded-full bg-white/10 shadow-inner backdrop-blur-sm",
        className,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn(
          "h-full transition-[width] duration-700 ease-out relative",
          fillClassName ?? "bg-white",
        )}
        style={{ width: `${pct}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-[shimmer_2s_infinite]" />
      </div>
    </div>
  );
}
