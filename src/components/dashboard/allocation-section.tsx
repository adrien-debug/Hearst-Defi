import { ApyRange } from "@/components/ui/apy-range";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type { AllocationBucket, ApyRange as ApyRangeT } from "@/lib/mock/dashboard";

const BUCKET_TONES: Record<AllocationBucket["id"], string> = {
  mining: "var(--color-brand)",
  "usdc-base": "rgba(var(--brand-accent-rgb), 0.55)",
  "btc-tactical": "rgba(var(--color-warning-rgb), 0.85)",
  "stable-reserve": "rgba(255, 255, 255, 0.35)",
};

interface AllocationSectionProps {
  allocations: AllocationBucket[];
  blendedYieldRange: ApyRangeT;
}

const RADIUS = 64;
const STROKE = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE) * 2;

export function AllocationSection({
  allocations,
  blendedYieldRange,
}: AllocationSectionProps) {
  const total = allocations.reduce((sum, b) => sum + b.pctAum, 0);
  let cursor = 0;
  const segments = allocations.map((bucket) => {
    const frac = total > 0 ? bucket.pctAum / total : 0;
    const dash = frac * CIRCUMFERENCE;
    const offset = -cursor;
    cursor += dash;
    return {
      bucket,
      dash,
      gap: CIRCUMFERENCE - dash,
      offset,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocation</CardTitle>
        <div className="flex items-center gap-2 text-xs text-[--color-text-muted]">
          <span>Blended target</span>
          <ApyRange
            className="text-[--color-text]"
            low={blendedYieldRange.low}
            high={blendedYieldRange.high}
          />
        </div>
      </CardHeader>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex justify-center lg:w-[200px]">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            role="img"
            aria-label="Allocation breakdown"
            className="-rotate-90"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--color-bg-elevated)"
              strokeWidth={STROKE}
            />
            {segments.map(({ bucket, dash, gap, offset }) => (
              <circle
                key={bucket.id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={BUCKET_TONES[bucket.id]}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            ))}
          </svg>
        </div>

        <ul className="flex-1 divide-y divide-[--color-border-subtle]">
          {allocations.map((bucket) => (
            <li
              key={bucket.id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                  )}
                  style={{ background: BUCKET_TONES[bucket.id] }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{bucket.label}</span>
                    <ProvenanceBadge kind={bucket.provenance} />
                  </div>
                  <p className="mt-0.5 text-xs text-[--color-text-dim]">
                    {bucket.yieldNote}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm tabular-nums">
                  {bucket.pctAum.toFixed(0)}%
                </div>
                <div className="font-mono text-xs text-[--color-text-muted] tabular-nums">
                  {bucket.yieldBps > 0
                    ? `+${bucket.yieldBps} bps`
                    : "P&L variable"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
