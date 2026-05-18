import { cn } from "@/lib/cn";

interface PtaiProps {
  projection: string;
  trigger: string;
  action: string;
  impact: string;
  className?: string;
}

const ROWS: ReadonlyArray<{ key: keyof PtaiProps; label: string; iconColor: string }> = [
  { key: "projection", label: "Projection", iconColor: "text-blue-400" },
  { key: "trigger", label: "Trigger", iconColor: "text-amber-400" },
  { key: "action", label: "Action", iconColor: "text-purple-400" },
  { key: "impact", label: "Impact", iconColor: "text-green-400" },
];

export function Ptai({
  projection,
  trigger,
  action,
  impact,
  className,
}: PtaiProps) {
  const values: Record<"projection" | "trigger" | "action" | "impact", string> =
    { projection, trigger, action, impact };
  return (
    <div className={cn("glass-panel-subtle p-4 rounded-xl relative overflow-hidden group", className)}>
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-white/20 to-transparent opacity-50" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm relative z-10">
        {ROWS.map(({ key, label, iconColor }) => (
          <div key={key} className="contents group/row">
            <dt className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/40 pt-0.5 group-hover/row:text-white/60 transition-colors">
              <span className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]", iconColor)} />
              {label}
            </dt>
            <dd className="text-white/80 font-medium group-hover/row:text-white transition-colors">
              {values[key as "projection" | "trigger" | "action" | "impact"]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
