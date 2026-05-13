import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type { MiningHealth } from "@/lib/mock/dashboard";

interface MiningHealthSectionProps {
  miningHealth: MiningHealth;
}

type Tone = "good" | "warn" | "bad";

function scoreTone(score: number): Tone {
  if (score >= 70) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

function trendTone(pct: number): Tone {
  if (pct >= -5) return "good";
  if (pct >= -15) return "warn";
  return "bad";
}

const TONE_TEXT: Record<Tone, string> = {
  good: "text-[--color-success]",
  warn: "text-[--color-warning]",
  bad: "text-[--color-danger]",
};

const TONE_BAR: Record<Tone, string> = {
  good: "bg-[--color-success]",
  warn: "bg-[--color-warning]",
  bad: "bg-[--color-danger]",
};

const TONE_DOT: Record<Tone, string> = {
  good: "🟢",
  warn: "🟠",
  bad: "🔴",
};

interface ScoreRowProps {
  label: string;
  hint: string;
  value: string;
  tone: Tone;
  bar?: number;
}

function ScoreRow({ label, hint, value, tone, bar }: ScoreRowProps) {
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-[10px]">
              {TONE_DOT[tone]}
            </span>
            <span className="text-sm font-medium">{label}</span>
          </div>
          <p className="mt-0.5 text-xs text-[--color-text-dim]">{hint}</p>
        </div>
        <span
          className={cn(
            "font-mono text-lg tabular-nums",
            TONE_TEXT[tone],
          )}
        >
          {value}
        </span>
      </div>
      {typeof bar === "number" ? (
        <div className="h-1 w-full overflow-hidden rounded-full bg-[--color-bg-elevated]">
          <div
            className={cn("h-full", TONE_BAR[tone])}
            style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function MiningHealthSection({
  miningHealth,
}: MiningHealthSectionProps) {
  const marginTone = scoreTone(miningHealth.marginScore);
  const trendT = trendTone(miningHealth.hashpriceTrendPct);
  const opTone = scoreTone(miningHealth.opConfidence);
  const trendPctClamped =
    50 + Math.max(-50, Math.min(50, miningHealth.hashpriceTrendPct * 5));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mining Health</CardTitle>
        <ProvenanceBadge kind={miningHealth.provenance} />
      </CardHeader>
      <div className="divide-y divide-[--color-border-subtle]">
        <ScoreRow
          label="Mining Margin Score"
          hint="current margin / target margin"
          value={`${miningHealth.marginScore}/100`}
          tone={marginTone}
          bar={miningHealth.marginScore}
        />
        <ScoreRow
          label="Hashprice Trend"
          hint="30d avg vs 60d avg"
          value={`${miningHealth.hashpriceTrendPct >= 0 ? "+" : ""}${miningHealth.hashpriceTrendPct.toFixed(1)}%`}
          tone={trendT}
          bar={trendPctClamped}
        />
        <ScoreRow
          label="Operational Confidence"
          hint="uptime + attestation freshness + energy stability"
          value={`${miningHealth.opConfidence}/100`}
          tone={opTone}
          bar={miningHealth.opConfidence}
        />
      </div>
    </Card>
  );
}
