import { Badge } from "@/components/ui/badge";

type VaultStatus = "draft" | "review" | "deployed" | "live" | "paused" | "closed";

const STATUS_MAP: Record<
  VaultStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "brand" }
> = {
  draft: { label: "Draft", variant: "default" },
  review: { label: "Review", variant: "warning" },
  deployed: { label: "Deployed", variant: "brand" },
  live: { label: "Live", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  closed: { label: "Closed", variant: "danger" },
};

interface VaultStatusPillProps {
  status: string;
  className?: string;
}

export function VaultStatusPill({ status, className }: VaultStatusPillProps) {
  const config = STATUS_MAP[status as VaultStatus] ?? { label: status, variant: "default" as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
