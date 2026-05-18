import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type {
  RiskBand,
  RiskDimension,
  RiskFrameworkData,
  RiskSeverity,
} from "@/lib/data/risk-framework";

interface RiskFrameworkSectionProps {
  data: RiskFrameworkData;
}

const SEVERITY_TEXT: Record<RiskSeverity, string> = {
  low: "ct-status-glow-success",
  medium: "ct-status-glow-warning",
  high: "ct-status-glow-danger",
};

const SEVERITY_BAR: Record<RiskSeverity, string> = {
  low: "ct-status-dot-success",
  medium: "ct-status-dot-warning",
  high: "ct-status-dot-danger",
};

const SEVERITY_DOT: Record<RiskSeverity, string> = {
  low: "var(--ct-status-success)",
  medium: "var(--ct-status-warning)",
  high: "var(--ct-status-danger)",
};

const SEVERITY_VARIANT: Record<
  RiskSeverity,
  "success" | "warning" | "danger"
> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

const BAND_VARIANT: Record<RiskBand, "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

const BAND_TEXT: Record<RiskBand, string> = {
  low: "ct-status-glow-success",
  medium: "ct-status-glow-warning",
  high: "ct-status-glow-danger",
};

const BAND_BAR: Record<RiskBand, string> = {
  low: "ct-status-dot-success",
  medium: "ct-status-dot-warning",
  high: "ct-status-dot-danger",
};

function provenanceFromSource(
  source: RiskFrameworkData["source"],
): import("@/components/ui/provenance-badge").Provenance {
  switch (source) {
    case "db":
      return "live";
    case "partial":
      return "partial";
    case "fallback":
      return "estimated";
  }
}

export function RiskFrameworkSection({ data }: RiskFrameworkSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Framework</CardTitle>
        <ProvenanceBadge kind={provenanceFromSource(data.source)} />
      </CardHeader>

      <CompositeHeader
        composite={data.composite}
        band={data.band}
        bandLabel={data.bandLabel}
      />

      <ul className="mt-6 ct-divide-soft">
        {data.dimensions.map((d) => (
          <li key={d.id}>
            <RiskRow dimension={d} />
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-white/30 italic leading-relaxed">
        Composite score is the weighted sum of the five dimensions defined in
        Methodology v1.0. Conditional projection — not guaranteed.
      </p>
    </Card>
  );
}

interface CompositeHeaderProps {
  composite: number;
  band: RiskBand;
  bandLabel: string;
}

function CompositeHeader({ composite, band, bandLabel }: CompositeHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl glass-panel-subtle px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-medium uppercase tracking-widest text-white/50">Composite</span>
        <span className={cn("text-4xl font-semibold tracking-tight tabular-nums", BAND_TEXT[band])}>
          {composite}
          <span className="text-white/30 text-lg font-normal ml-1">
            / 100
          </span>
        </span>
      </div>
      <div className="flex items-center gap-4 sm:min-w-[15rem]">
        <Progress
          value={composite}
          fillClassName={BAND_BAR[band]}
          className="h-2 flex-1"
        />
        <Badge variant={BAND_VARIANT[band]}>{bandLabel}</Badge>
      </div>
    </div>
  );
}

interface RiskRowProps {
  dimension: RiskDimension;
}

function RiskRow({ dimension }: RiskRowProps) {
  const { label, status, score, severity, detail } = dimension;
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4 group">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          aria-hidden
          className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor]"
          style={{ background: SEVERITY_DOT[severity], color: SEVERITY_DOT[severity] }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-white group-hover:text-white/90 transition-colors">
              {label}
            </span>
            <Badge variant={SEVERITY_VARIANT[severity]}>{status}</Badge>
          </div>
          <p className="mt-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">{detail}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:w-[11.25rem] sm:justify-end">
        <span
          className={cn(
            "text-lg font-semibold leading-none w-9 text-right tabular-nums",
            SEVERITY_TEXT[severity],
          )}
        >
          {score}
        </span>
        <Progress
          value={score}
          fillClassName={SEVERITY_BAR[severity]}
          className="h-1.5 w-[5rem] sm:w-[6.25rem]"
        />
      </div>
    </div>
  );
}
