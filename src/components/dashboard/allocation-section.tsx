import { ApyRange } from "@/components/ui/apy-range";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type { AllocationBucket, ApyRange as ApyRangeT } from "@/lib/mock/dashboard";

const BUCKET_TONES: Record<AllocationBucket["id"], string> = {
  mining: "var(--ct-text-strong)",
  "usdc-base": "var(--ct-text-body)",
  "btc-tactical": "var(--ct-status-warning)",
  "stable-reserve": "var(--ct-text-faint)",
};

interface AllocationSectionProps {
  allocations: AllocationBucket[];
  blendedYieldRange: ApyRangeT;
}

const RADIUS = 70;
const STROKE = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE) * 2;

export function AllocationSection({
  allocations,
  blendedYieldRange,
}: AllocationSectionProps) {
  const total = allocations.reduce((sum, b) => sum + b.pctAum, 0);
  const segments = allocations.reduce((acc, bucket) => {
    const frac = total > 0 ? bucket.pctAum / total : 0;
    const dash = frac * CIRCUMFERENCE;
    const offset = -acc.cursor;
    acc.items.push({
      bucket,
      dash,
      gap: CIRCUMFERENCE - dash,
      offset,
    });
    acc.cursor += dash;
    return acc;
  }, { cursor: 0, items: [] as Array<{ bucket: AllocationBucket; dash: number; gap: number; offset: number }> }).items;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocation</CardTitle>
        <div className="flex items-center gap-3 text-xs text-white/50 glass-panel-subtle px-3 py-1.5 rounded-full">
          <span className="uppercase tracking-widest font-medium">Blended target</span>
          <ApyRange
            className="text-white drop-shadow-sm"
            low={blendedYieldRange.low}
            high={blendedYieldRange.high}
          />
        </div>
      </CardHeader>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
        <div className="flex justify-center lg:w-[13.75rem] relative group">
          <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-500" />
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            role="img"
            aria-label="Allocation breakdown"
            className="-rotate-90 relative z-10"
            style={{ filter: "drop-shadow(var(--ct-glow-subtle))" }}
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--ct-border-soft)"
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
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out hover:stroke-white cursor-pointer"
              />
            ))}
          </svg>
        </div>

        <ul className="flex-1 divide-y divide-white/10">
          {allocations.map((bucket) => (
            <li
              key={bucket.id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 group hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition-colors"
            >
              <div className="flex items-start gap-4">
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 h-3 w-3 shrink-0 rounded-full shadow-[--ct-glow-dot]",
                  )}
                  style={{ background: BUCKET_TONES[bucket.id], color: BUCKET_TONES[bucket.id] }}
                />
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white group-hover:text-white/90 transition-colors">{bucket.label}</span>
                    <ProvenanceBadge kind={bucket.provenance} />
                  </div>
                  <p className="mt-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                    {bucket.yieldNote}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-semibold tabular-nums text-white/90">
                  {bucket.pctAum.toFixed(0)}%
                </div>
                <div className="font-mono text-xs text-white/40 tabular-nums">
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
