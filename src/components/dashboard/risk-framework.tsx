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
  low: "text-[--color-success]",
  medium: "text-[--color-warning]",
  high: "text-[--color-danger]",
};

const SEVERITY_BAR: Record<RiskSeverity, string> = {
  low: "bg-[--color-success]",
  medium: "bg-[--color-warning]",
  high: "bg-[--color-danger]",
};

const SEVERITY_DOT: Record<RiskSeverity, string> = {
  low: "var(--color-success)",
  medium: "var(--color-warning)",
  high: "var(--color-danger)",
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
  low: "text-[--color-success]",
  medium: "text-[--color-warning]",
  high: "text-[--color-danger]",
};

const BAND_BAR: Record<RiskBand, string> = {
  low: "bg-[--color-success]",
  medium: "bg-[--color-warning]",
  high: "bg-[--color-danger]",
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

      <ul className="mt-5 divide-y divide-[--color-border-subtle]">
        {data.dimensions.map((d) => (
          <li key={d.id}>
            <RiskRow dimension={d} />
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs text-[--color-text-dim]">
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
    <div className="flex flex-col gap-3 rounded-[--radius-button] border border-[--color-border-subtle] bg-[--color-bg-elevated] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-baseline gap-3">
        <span className="stat-label">Composite</span>
        <span className={cn("h3 leading-none tabular", BAND_TEXT[band])}>
          {composite}
          <span className="text-[--color-text-dim] text-sm font-normal">
            {" "}
            / 100
          </span>
        </span>
      </div>
      <div className="flex items-center gap-3 sm:min-w-[240px]">
        <Progress
          value={composite}
          fillClassName={BAND_BAR[band]}
          className="h-1.5 flex-1"
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
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          aria-hidden
          className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: SEVERITY_DOT[severity] }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[--color-text]">
              {label}
            </span>
            <Badge variant={SEVERITY_VARIANT[severity]}>{status}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-[--color-text-dim]">{detail}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:w-[160px] sm:justify-end">
        <span
          className={cn(
            "stat-value leading-none w-9 text-right tabular",
            SEVERITY_TEXT[severity],
          )}
        >
          {score}
        </span>
        <Progress
          value={score}
          fillClassName={SEVERITY_BAR[severity]}
          className="h-1 w-[68px] sm:w-20"
        />
      </div>
    </div>
  );
}
