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
        "glass-panel flex flex-col gap-3 p-5 relative overflow-hidden group",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex items-center justify-between gap-2 relative z-10">
        <span className="stat-label text-[--color-text-dim] group-hover:text-[--color-text-muted] transition-colors" title={tooltip}>
          {label}
        </span>
        {provenance ? <ProvenanceBadge kind={provenance} /> : null}
      </div>
      
      <span className="stat-value text-3xl tracking-tight leading-none relative z-10 text-white drop-shadow-md">
        {value}
      </span>
      
      {(sublabel || trend) && (
        <div className="flex items-center gap-2 text-xs text-[--color-text-dim] relative z-10 mt-auto pt-1">
          {trend ? (
            <span
              className={cn(
                "font-medium px-1.5 py-0.5 rounded-md backdrop-blur-md",
                trend.direction === "up" && "bg-green-500/10 text-green-400 border border-green-500/20",
                trend.direction === "down" && "bg-red-500/10 text-red-400 border border-red-500/20",
                trend.direction === "flat" && "bg-white/5 text-white/60 border border-white/10"
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
