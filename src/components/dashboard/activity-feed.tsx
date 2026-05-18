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
        <span className="text-xs font-medium uppercase tracking-widest text-white/40">last 5 events</span>
      </CardHeader>
      <div className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent" />
        <ol className="space-y-6">
          {last5.map((event) => (
            <li key={event.id} className="relative pl-10 group">
              <div className="absolute left-[11px] top-1.5 h-2.5 w-2.5 rounded-full bg-black border border-white/30 group-hover:border-white/80 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-300 z-10" />
              <div className="mb-4 flex items-center gap-3">
                <Badge variant={KIND_VARIANT[event.kind]}>
                  {KIND_LABEL[event.kind]}
                </Badge>
                <span className="font-mono text-xs text-white/40 group-hover:text-white/60 transition-colors tabular-nums">
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
      </div>
    </Card>
  );
}
