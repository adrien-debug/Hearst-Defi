import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Ptai } from "@/components/ui/ptai";
import type { PtaiEvent } from "@/lib/mock/dashboard";

interface ActivityFeedProps {
  events: PtaiEvent[];
}

const KIND_VARIANT: Record<
  PtaiEvent["kind"],
  "success" | "brand" | "warning" | "default"
> = {
  rebalance: "brand",
  distribution: "success",
  alert: "warning",
};

const KIND_LABEL: Record<PtaiEvent["kind"], string> = {
  rebalance: "Rebalance",
  distribution: "Distribution",
  alert: "Alert",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function ActivityFeed({ events }: ActivityFeedProps) {
  const last5 = events.slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <span className="text-xs text-[--color-text-dim]">last 5 events</span>
      </CardHeader>
      <ol className="divide-y divide-[--color-border-subtle]">
        {last5.map((event) => (
          <li key={event.id} className="py-4 first:pt-0 last:pb-0">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant={KIND_VARIANT[event.kind]}>
                {KIND_LABEL[event.kind]}
              </Badge>
              <span className="font-mono text-xs text-[--color-text-muted] tabular-nums">
                {dateFmt.format(new Date(event.timestamp))} UTC
              </span>
            </div>
            <Ptai
              projection={event.projection}
              trigger={event.trigger}
              action={event.action}
              impact={event.impact}
            />
          </li>
        ))}
      </ol>
    </Card>
  );
}
