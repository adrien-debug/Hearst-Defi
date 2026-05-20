import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type { MiningHealth } from "@/lib/mock/dashboard";

export interface MiningHealthHashprice {
  usd_per_th_day: number;
  stale: boolean;
}

interface MiningHealthSectionProps {
  miningHealth: MiningHealth;
  hashprice?: MiningHealthHashprice | null;
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
  good: "ct-status-glow-success",
  warn: "ct-status-glow-warning",
  bad: "ct-status-glow-danger",
};

const TONE_BAR: Record<Tone, string> = {
  good: "ct-status-dot-success",
  warn: "ct-status-dot-warning",
  bad: "ct-status-dot-danger",
};

const TONE_DOT_COLOR: Record<Tone, string> = {
  good: "var(--ct-status-success)",
  warn: "var(--ct-status-warning)",
  bad: "var(--ct-status-danger)",
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
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 group">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full shadow-[--ct-glow-dot]"
              style={{ background: TONE_DOT_COLOR[tone], color: TONE_DOT_COLOR[tone] }}
            />
            <span className="text-sm font-medium text-[--ct-text-primary] group-hover:text-[--ct-text-body] transition-colors">{label}</span>
          </div>
          <p className="mt-1 text-xs text-[--ct-text-muted]">{hint}</p>
        </div>
        <span className={cn("text-xl font-semibold leading-tight tabular-nums", TONE_TEXT[tone])}>
          {value}
        </span>
      </div>
      {typeof bar === "number" ? (
        <Progress
          value={bar}
          fillClassName={TONE_BAR[tone]}
          className="h-1.5"
        />
      ) : null}
    </div>
  );
}

export function MiningHealthSection({
  miningHealth,
  hashprice,
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
      <div className="divide-y divide-[--ct-border-soft]">
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
        {hashprice && hashprice.usd_per_th_day > 0 ? (
          <HashpriceRow hashprice={hashprice} />
        ) : null}
      </div>
    </Card>
  );
}

interface HashpriceRowProps {
  hashprice: MiningHealthHashprice;
}

function HashpriceRow({ hashprice }: HashpriceRowProps) {
  const provenance = hashprice.stale ? "stale" : "live";
  return (
    <div className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 group">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[--ct-text-primary] group-hover:text-[--ct-text-body] transition-colors">
              Hashprice
            </span>
          </div>
          <p className="mt-1 text-xs text-[--ct-text-muted]">
            BTC subsidy / network difficulty
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold leading-tight text-[--ct-text-primary] tabular-nums">
            ${hashprice.usd_per_th_day.toFixed(3)} <span className="text-sm text-[--ct-text-muted] font-normal">/TH/day</span>
          </span>
          <ProvenanceBadge kind={provenance} />
        </div>
      </div>
    </div>
  );
}
