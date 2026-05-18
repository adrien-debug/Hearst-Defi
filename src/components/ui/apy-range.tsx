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
      className={cn("font-mono tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-500 font-semibold drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]", className)}
      aria-label={`APY range ${fmt(a)} to ${fmt(b)} ${suffix}`}
    >
      {fmt(a)}
      <span aria-hidden className="mx-1 text-white/30 font-sans font-light">
        —
      </span>
      {fmt(b)}
      <span className="text-emerald-400/80 ml-0.5">{suffix}</span>
    </span>
  );
}
