import { ProvenanceBadge, type Provenance } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";

/** Alias so callers may reference either name. */
export type ProvenanceKind = Provenance;

const positionClasses = {
  "top-right": "top-2 right-2",
  "top-left": "top-2 left-2",
  "bottom-right": "bottom-2 right-2",
} as const;

/** Format a Date to HH:MM (24 h, local timezone). */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Source label shown in the tooltip. */
const sourceLabels: Record<Provenance, string> = {
  live: "real-time feed",
  oracle: "on-chain oracle",
  attested: "signed attestation",
  estimated: "model estimate",
  partial: "partial data",
  manual: "manual input",
  stale: "cached / stale",
};

export interface ChartProvenanceCornerProps {
  kind: ProvenanceKind;
  lastUpdateAt?: Date;
  position?: "top-right" | "top-left" | "bottom-right";
  className?: string;
}

/**
 * Absolute-positioned glass panel that overlays a chart corner with a
 * ProvenanceBadge and an optional "Last update HH:MM, source: …" tooltip.
 *
 * Minimum 24 × 24 px touch target.
 */
export function ChartProvenanceCorner({
  kind,
  lastUpdateAt,
  position = "top-right",
  className,
}: ChartProvenanceCornerProps) {
  const tooltipParts: string[] = [`source: ${sourceLabels[kind]}`];
  if (lastUpdateAt) {
    tooltipParts.unshift(`Last update ${formatTime(lastUpdateAt)}`);
  }
  const tooltipText = tooltipParts.join(", ");

  return (
    <div
      role="img"
      aria-label={`Data provenance: ${kind}${lastUpdateAt ? ` — last updated ${formatTime(lastUpdateAt)}` : ""}`}
      title={tooltipText}
      className={cn(
        "absolute z-10 flex min-h-6 min-w-6 items-center px-1.5 py-0.5",
        "rounded-md border border-[var(--ct-border-soft)]",
        "bg-[var(--ct-glass-bg,var(--ct-surface-1))]",
        "text-[var(--ct-text-muted)]",
        "backdrop-blur-sm",
        positionClasses[position],
        className,
      )}
    >
      <ProvenanceBadge kind={kind} />
    </div>
  );
}
