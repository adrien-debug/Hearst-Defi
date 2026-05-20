import { Badge } from "@/components/ui/badge";

export type Provenance =
  | "live"
  | "oracle"
  | "attested"
  | "estimated"
  | "partial"
  | "manual"
  | "stale";

const labels: Record<Provenance, string> = {
  live: "Live",
  oracle: "Oracle",
  attested: "Attested",
  estimated: "Estimated",
  partial: "Partial",
  manual: "Manual",
  stale: "Stale",
};

const variants: Record<
  Provenance,
  "success" | "brand" | "default" | "warning" | "danger"
> = {
  live: "success",
  oracle: "brand",
  attested: "brand",
  estimated: "warning",
  partial: "warning",
  manual: "default",
  stale: "danger",
};

const dotColor: Record<Provenance, string> = {
  live: "var(--ct-status-success)",
  oracle: "var(--ct-text-strong)",
  attested: "var(--ct-text-strong)",
  estimated: "var(--ct-status-warning)",
  partial: "var(--ct-status-warning)",
  manual: "var(--ct-text-muted)",
  stale: "var(--ct-status-danger)",
};

export function ProvenanceBadge({ kind }: { kind: Provenance }) {
  return (
    <Badge variant={variants[kind]} title={`Data provenance: ${labels[kind]}`}>
      <span
        aria-hidden
        className="inline-block h-[var(--ct-space-1_5)] w-[var(--ct-space-1_5)] rounded-full"
        style={{ background: dotColor[kind] }}
      />
      {labels[kind]}
    </Badge>
  );
}
