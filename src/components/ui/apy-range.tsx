import { cn } from "@/lib/cn";

interface ApyRangeProps {
  low: number;
  high: number;
  precision?: 0 | 1 | 2;
  suffix?: string;
  className?: string;
}

export function ApyRange({
  low,
  high,
  precision = 1,
  suffix = "%",
  className,
}: ApyRangeProps) {
  const [a, b] = low <= high ? [low, high] : [high, low];
  const fmt = (n: number) => n.toFixed(precision);
  return (
    <span
      className={cn(
        "font-mono tabular-nums font-semibold ct-status-glow-success",
        className,
      )}
      style={{ color: "var(--ct-status-success)" }}
      aria-label={`APY range ${fmt(a)} to ${fmt(b)} ${suffix}`}
    >
      {fmt(a)}
      <span aria-hidden className="mx-1 text-[--ct-text-muted] font-sans font-light">
        —
      </span>
      {fmt(b)}
      <span
        className="ml-0.5"
        style={{ color: "var(--ct-status-success)", opacity: 0.8 }}
      >
        {suffix}
      </span>
    </span>
  );
}
