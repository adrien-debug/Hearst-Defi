import { progressScoreFillClass } from "@/components/scenario/output-panel-shared";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type { ScenarioOutput } from "@/lib/engine/types";

interface ScenarioRiskMiningGridProps {
  output: ScenarioOutput;
  density?: "default" | "compact";
  riskDelta?: React.ReactNode;
}

function ScoreCard({
  density,
  label,
  score,
  fillClassName,
  footer,
  riskDelta,
}: {
  density: "default" | "compact";
  label: string;
  score: number;
  fillClassName: string;
  footer: React.ReactNode;
  riskDelta?: React.ReactNode;
}) {
  const inner = (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          density === "compact" ? "mb-2" : "mb-3",
        )}
      >
        <span
          className={density === "compact" ? "stat-label text-micro" : "stat-label"}
        >
          {label}
        </span>
        <ProvenanceBadge kind="estimated" />
      </div>
      <div className="mb-1 flex items-baseline gap-1">
        <span
          className={
            density === "compact"
              ? "mono text-xl font-extrabold tabular-nums text-[--ct-text-primary]"
              : "mono text-2xl font-extrabold tabular-nums text-[--ct-text-primary]"
          }
        >
          {score.toFixed(0)}
        </span>
        <span
          className={
            density === "compact"
              ? "text-xs text-[--ct-text-muted]"
              : "text-sm text-[--ct-text-muted]"
          }
        >
          /100
        </span>
      </div>
      <Progress
        value={score}
        fillClassName={fillClassName}
        className={density === "compact" ? "mt-1.5" : "mt-2"}
      />
      {riskDelta}
      {footer}
    </>
  );

  if (density === "compact") {
    return <div className="glass-panel-subtle p-4">{inner}</div>;
  }
  return <Card>{inner}</Card>;
}

export function ScenarioRiskMiningGrid({
  output,
  density = "default",
  riskDelta,
}: ScenarioRiskMiningGridProps) {
  const riskColorClass = progressScoreFillClass(output.risk_score, true);
  const miningColorClass = progressScoreFillClass(
    output.mining_margin_score,
    false,
  );

  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        density === "default" && "gap-4",
      )}
    >
      <ScoreCard
        density={density}
        label="Risk Score"
        score={output.risk_score}
        fillClassName={riskColorClass}
        riskDelta={riskDelta}
        footer={
          density === "default" ? (
            <p className="mt-2 text-xs text-[--ct-text-muted]">Lower = lower risk</p>
          ) : null
        }
      />
      <ScoreCard
        density={density}
        label="Mining Margin"
        score={output.mining_margin_score}
        fillClassName={miningColorClass}
        footer={
          <p
            className={cn(
              "text-[--ct-text-muted]",
              density === "compact" ? "mt-2 text-micro" : "mt-2 text-xs",
            )}
          >
            Current vs target
          </p>
        }
      />
    </div>
  );
}
