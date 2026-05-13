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
        "flex flex-col gap-2 rounded-[--radius-card] border border-[--color-border] bg-[--color-bg-card] p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="stat-label" title={tooltip}>
          {label}
        </span>
        {provenance ? <ProvenanceBadge kind={provenance} /> : null}
      </div>
      <span className="stat-value leading-tight">{value}</span>
      {(sublabel || trend) && (
        <div className="flex items-center gap-2 text-xs text-[--color-text-muted]">
          {trend ? (
            <span
              className={cn(
                "font-medium",
                trend.direction === "up" && "text-[--color-success]",
                trend.direction === "down" && "text-[--color-danger]",
              )}
            >
              {trend.direction === "up"
                ? "▲ "
                : trend.direction === "down"
                  ? "▼ "
                  : "→ "}
              {trend.text}
            </span>
          ) : null}
          {sublabel ? <span>{sublabel}</span> : null}
        </div>
      )}
    </div>
  );
}
