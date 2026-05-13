import { Badge } from "@/components/ui/badge";
import {
  statusBadgeVariant,
  statusDotColor,
  statusLabel,
  type RoadmapStatus,
} from "@/lib/roadmap-types";

export function StatusPill({ status }: { status: RoadmapStatus }) {
  return (
    <Badge variant={statusBadgeVariant(status)}>
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: statusDotColor(status) }}
      />
      {statusLabel(status)}
    </Badge>
  );
}
