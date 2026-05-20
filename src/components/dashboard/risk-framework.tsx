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

const SEVERITY_DOT_CLASS: Record<RiskSeverity, string> = {
  low: "ct-status-dot-success",
  medium: "ct-status-dot-warning",
  high: "ct-status-dot-danger",
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

      <p className="mt-6 text-xs text-[--ct-text-faint] italic leading-relaxed">
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
    <div className="flex flex-col gap-4 rounded-[--ct-radius-xl] glass-panel-subtle px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-baseline gap-3">
        <span className="stat-label">Composite</span>
        <span className={cn("text-3xl font-semibold tracking-tight tabular-nums", BAND_TEXT[band])}>
          {composite}
          <span className="text-[--ct-text-faint] text-lg font-normal ml-1">
            / 100
          </span>
        </span>
      </div>
      <div className="flex items-center gap-4 sm:min-w-60">
        <Progress
          value={composite}
          fillClassName={BAND_BAR[band]}
          className="h-2 flex-1"
          label={`Composite risk score ${composite} of 100, ${bandLabel}`}
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
          className={cn(
            "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
            SEVERITY_DOT_CLASS[severity],
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[--ct-text-primary] group-hover:text-[--ct-text-body] transition-colors">
              {label}
            </span>
            <Badge variant={SEVERITY_VARIANT[severity]}>{status}</Badge>
          </div>
          <p className="mt-1 text-xs text-[--ct-text-muted] group-hover:text-[--ct-text-body] transition-colors">{detail}</p>
        </div>
      </div>
      {/* sm:w-[11.25rem] conservé — 11.25rem = 180px, pas de step natif Tailwind (w-44=176px trop étroit, w-48=192px trop large) */}
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
          /* 6.25rem = 100px ; pas de step 25 dans la spacing scale Tailwind v4 par défaut */
          className="h-1.5 w-20 sm:w-[6.25rem]"
          label={`${label} risk score ${score} of 100, ${status}`}
        />
      </div>
    </div>
  );
}
