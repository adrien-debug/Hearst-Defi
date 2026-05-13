import { cn } from "@/lib/cn";

interface PtaiProps {
  projection: string;
  trigger: string;
  action: string;
  impact: string;
  className?: string;
}

const ROWS: ReadonlyArray<{ key: keyof PtaiProps; label: string }> = [
  { key: "projection", label: "Projection" },
  { key: "trigger", label: "Trigger" },
  { key: "action", label: "Action" },
  { key: "impact", label: "Impact" },
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
    <dl
      className={cn(
        "grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm",
        className,
      )}
    >
      {ROWS.map(({ key, label }) => (
        <div key={key} className="contents">
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--color-text-dim] pt-0.5">
            {label}
          </dt>
          <dd className="text-[--color-text]">
            {values[key as "projection" | "trigger" | "action" | "impact"]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
