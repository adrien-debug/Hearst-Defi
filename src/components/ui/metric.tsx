import {
  ProvenanceBadge,
  type Provenance,
} from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";

interface MetricProps {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  trend?: { direction: "up" | "down" | "flat"; text: string };
  provenance?: Provenance;
  tooltip?: string;
  className?: string;
}

export function Metric({
  label,
  value,
  sublabel,
  trend,
  provenance,
  tooltip,
  className,
}: MetricProps) {
  return (
    <div
      className={cn(
        "ct-kpi-card glass-panel flex flex-col gap-3 relative overflow-hidden group",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[--ct-surface-0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--ct-dur-slow)] pointer-events-none" />

      <div className="flex items-center justify-between gap-2 relative z-[var(--ct-z-raised)]">
        <span className="stat-label text-[--ct-text-muted] group-hover:text-[--ct-text-body] transition-colors" title={tooltip}>
          {label}
        </span>
        {provenance ? <ProvenanceBadge kind={provenance} /> : null}
      </div>

      <span className="stat-value relative z-[var(--ct-z-raised)] text-[--ct-text-strong] drop-shadow-[var(--ct-glow-subtle)]">
        {value}
      </span>

      {(sublabel || trend) && (
        <div className="flex min-w-0 items-center gap-2 text-xs text-[--ct-text-muted] relative z-[var(--ct-z-raised)] mt-auto pt-1">
          {trend ? (
            <span
              className={cn(
                "font-medium shrink-0 px-1.5 py-0.5 rounded-[--ct-radius-sm] backdrop-blur-md border",
                trend.direction === "up" && "bg-[--ct-status-success-soft] text-[--ct-status-success] border-[--ct-status-success-border]",
                trend.direction === "down" && "bg-[--ct-status-danger-soft] text-[--ct-status-danger] border-[--ct-status-danger-border]",
                trend.direction === "flat" && "bg-[--ct-surface-1] text-[--ct-text-muted] border-[--ct-border]"
              )}
            >
              {trend.direction === "up"
                ? "↑ "
                : trend.direction === "down"
                  ? "↓ "
                  : "→ "}
              {trend.text}
            </span>
          ) : null}
          {sublabel ? <span className="truncate">{sublabel}</span> : null}
        </div>
      )}
    </div>
  );
}
