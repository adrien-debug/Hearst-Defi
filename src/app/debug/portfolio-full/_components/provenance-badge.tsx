import { Badge } from "./badge";

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
  stale: "default",
};

export function ProvenanceBadge({ kind }: { kind: Provenance }) {
  return (
    <Badge variant={variants[kind]} title={`Data provenance: ${labels[kind]}`}>
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      />
      {labels[kind]}
    </Badge>
  );
}
