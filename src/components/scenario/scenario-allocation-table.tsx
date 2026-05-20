import {
  BUCKET_COLOR,
  BUCKET_LABEL,
} from "@/components/scenario/output-panel-shared";
import type { ScenarioOutput } from "@/lib/engine/types";

interface ScenarioAllocationTableProps {
  allocations: ScenarioOutput["allocations"];
  /** Compact compare panel uses smaller type scale. */
  density?: "default" | "compact";
}

export function ScenarioAllocationTable({
  allocations,
  density = "default",
}: ScenarioAllocationTableProps) {
  const headerClass =
    density === "compact"
      ? "mb-1.5 grid grid-cols-[1fr_auto_auto] gap-x-3 text-micro font-semibold uppercase tracking-wide text-[--ct-text-muted]"
      : "mb-2 grid grid-cols-[1fr_auto_auto] gap-x-4 text-micro font-semibold uppercase tracking-wide text-[--ct-text-muted]";
  const rowClass =
    density === "compact"
      ? "grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-1.5 text-sm first:pt-0.5 last:pb-0.5"
      : "grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-2.5 text-sm first:pt-1 last:pb-1";
  const yieldCol = density === "compact" ? "Yield" : "Yield contribution";

  return (
    <div>
      <div className={headerClass}>
        <span>Bucket</span>
        <span className="text-right">Pct</span>
        <span className="text-right">{yieldCol}</span>
      </div>
      <ul className="divide-y divide-[--ct-border-soft]">
        {allocations.map((a) => (
          <li key={a.bucket} className={rowClass}>
            <span className="flex min-w-0 items-center gap-2 text-[--ct-text-body]">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-current shadow-[var(--ct-glow-dot)]"
                style={{ color: BUCKET_COLOR[a.bucket] }}
                aria-hidden
              />
              <span className={density === "compact" ? "truncate" : undefined}>
                {BUCKET_LABEL[a.bucket]}
              </span>
            </span>
            <span className="mono tabular-nums text-right text-[--ct-text-primary]">
              {a.pct.toFixed(0)}%
            </span>
            <span
              className={
                density === "compact"
                  ? "mono text-right text-xs tabular-nums text-[--ct-text-muted]"
                  : "mono tabular-nums text-right text-[--ct-text-muted]"
              }
            >
              {a.yield_contribution_bps > 0
                ? density === "compact"
                  ? `+${a.yield_contribution_bps}bps`
                  : `+${a.yield_contribution_bps} bps`
                : density === "compact"
                  ? "P&L"
                  : "P&L variable"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
