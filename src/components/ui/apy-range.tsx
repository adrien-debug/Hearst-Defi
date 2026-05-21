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
        "tabular font-semibold text-[--ct-text-strong]",
        className,
      )}
      aria-label={`APY range ${fmt(a)} to ${fmt(b)} ${suffix}`}
    >
      {fmt(a)}
      <span aria-hidden className="mx-1 text-[--ct-text-muted] font-sans font-normal">
        —
      </span>
      {fmt(b)}
      <span
        className="ml-0.5 opacity-80"
      >
        {suffix}
      </span>
    </span>
  );
}
