import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type { BtcGuardrail, BtcTactical } from "@/lib/mock/dashboard";

interface BtcTacticalSectionProps {
  btcTactical: BtcTactical;
}

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

function guardrailVariant(
  status: BtcGuardrail["status"],
): "success" | "warning" | "danger" | "default" {
  switch (status) {
    case "healthy":
    case "normal":
      return "success";
    case "warning":
      return "warning";
    case "breached":
      return "danger";
    default:
      return "default";
  }
}

function guardrailLabel(status: BtcGuardrail["status"]): string {
  switch (status) {
    case "healthy":
      return "HEALTHY";
    case "normal":
      return "NORMAL";
    case "warning":
      return "WARNING";
    case "breached":
      return "BREACHED";
  }
}

interface RowProps {
  label: string;
  value: string;
  valueClass?: string;
}

function Row({ label, value, valueClass }: RowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3 text-sm group">
      <span className="text-white/50 group-hover:text-white/70 transition-colors">{label}</span>
      <span className={cn("font-mono tabular-nums text-white/90", valueClass)}>{value}</span>
    </div>
  );
}

export function BtcTacticalSection({ btcTactical }: BtcTacticalSectionProps) {
  const pnlTone =
    btcTactical.pnlUsd > 0
      ? "ct-status-glow-success"
      : btcTactical.pnlUsd < 0
        ? "ct-status-glow-danger"
        : "text-white/90";

  return (
    <Card>
      <CardHeader>
        <CardTitle>BTC Tactical</CardTitle>
        <ProvenanceBadge kind={btcTactical.provenance} />
      </CardHeader>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="divide-y divide-white/10">
          <Row
            label="Position size"
            value={`${btcTactical.positionSizePctAum.toFixed(0)}% AUM · ${usdCompact.format(btcTactical.positionSizeUsd)}`}
          />
          <Row label="BTC held" value={`${btcTactical.btcHeld.toFixed(2)} BTC`} />
          <Row label="Avg entry" value={usd0.format(btcTactical.avgEntry)} />
          <Row
            label="Current price"
            value={usd0.format(btcTactical.currentPrice)}
          />
          <Row
            label="Unrealized P&L"
            value={`${btcTactical.pnlUsd >= 0 ? "+" : "−"}${usdCompact.format(Math.abs(btcTactical.pnlUsd))} (${btcTactical.pnlPct >= 0 ? "+" : ""}${btcTactical.pnlPct.toFixed(1)}%)`}
            valueClass={pnlTone}
          />
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40 mb-3">
              Next triggers
            </p>
            {btcTactical.nextTriggers.length > 0 ? (
              <ul className="space-y-3">
                {btcTactical.nextTriggers.map((t) => (
                  <li
                    key={t.id}
                    className="glass-panel-subtle px-4 py-3 group hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white/90">{t.label}</span>
                      <Badge variant="default">{t.ruleId}</Badge>
                    </div>
                    <p className="mt-2 font-mono text-xs text-white/50 tabular-nums">
                      {t.condition}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/40 italic">No triggers currently armed.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40 mb-3">
              Guardrails
            </p>
            {btcTactical.guardrails.length > 0 ? (
              <ul className="space-y-3">
                {btcTactical.guardrails.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-start justify-between gap-3 glass-panel-subtle px-4 py-3 group hover:bg-white/[0.04] transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-white/90">{g.label}</div>
                      <p className="mt-1 text-xs text-white/50">
                        {g.detail}
                      </p>
                    </div>
                    <Badge variant={guardrailVariant(g.status)}>
                      {guardrailLabel(g.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/40 italic">All guardrails within bounds.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
