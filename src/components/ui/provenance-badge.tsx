import { Badge } from "@/components/ui/badge";

export type Provenance =
  | "live"
  | "oracle"
  | "attested"
  | "estimated"
  | "manual"
  | "stale";

const labels: Record<Provenance, string> = {
  live: "Live",
  oracle: "Oracle",
  attested: "Attested",
  estimated: "Estimated",
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
  manual: "default",
  stale: "danger",
};

const dotColor: Record<Provenance, string> = {
  live: "var(--color-success)",
  oracle: "var(--color-brand)",
  attested: "var(--color-brand)",
  estimated: "var(--color-warning)",
  manual: "var(--color-text-dim)",
  stale: "var(--color-danger)",
};

export function ProvenanceBadge({ kind }: { kind: Provenance }) {
  return (
    <Badge variant={variants[kind]} title={`Data provenance: ${labels[kind]}`}>
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: dotColor[kind] }}
      />
      {labels[kind]}
    </Badge>
  );
}
