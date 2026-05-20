import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Ptai } from "@/components/ui/ptai";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type { BtcTriggerKind, ScenarioOutput } from "@/lib/engine/types";

// ── Rebalancing action list ───────────────────────────────────────────────────
//
// Derives an ordered list of rebalancing actions (max 4) from the engine output.
// All strings come from the engine's btc_tactical triggers and allocations.
// No new arithmetic — only string formatting + ordering of existing fields.

type BadgeVariant = "success" | "warning" | "danger" | "default" | "brand";

interface RebalancingAction {
  ruleId: string;
  label: string;
  detail: string;
  triggerText: string;
  armed: boolean;
  priority: number;
  variant: BadgeVariant;
}

const KIND_LABEL: Record<BtcTriggerKind, string> = {
  accumulate: "Accumulate BTC",
  take_profit: "Take profit",
  reduce_size: "Reduce exposure",
  hold: "Hold posture",
};

const KIND_VARIANT: Record<BtcTriggerKind, BadgeVariant> = {
  accumulate: "success",
  take_profit: "brand",
  reduce_size: "warning",
  hold: "default",
};

function deriveActions(output: ScenarioOutput): RebalancingAction[] {
  const actions: RebalancingAction[] = [];

  const conditionByRuleId = new Map<string, string>(
    output.btc_tactical.triggers.map((t) => [t.id, t.condition]),
  );

  // 1. BTC tactical armed triggers first
  for (const trigger of output.btc_tactical.triggers) {
    if (!trigger.armed) continue;
    actions.push({
      ruleId: trigger.id,
      label: KIND_LABEL[trigger.kind],
      detail: trigger.action,
      triggerText: `${trigger.id} — ${trigger.condition}`,
      armed: true,
      priority: trigger.kind === "hold" ? 4 : 1,
      variant: KIND_VARIANT[trigger.kind],
    });
  }

  // 2. Mode-level rule inferred from vault mode
  if (output.mode === "defensive") {
    actions.push({
      ruleId: "R1/R2",
      label: "Switch to Defensive",
      detail:
        "BTC drawdown or mining margin breach — reduce BTC, increase stable reserve.",
      triggerText:
        conditionByRuleId.get("R1") ??
        conditionByRuleId.get("R2") ??
        "R1/R2 — conditions per methodology v1.0",
      armed: true,
      priority: 2,
      variant: "danger",
    });
  } else if (output.mode === "opportunistic") {
    actions.push({
      ruleId: "R3",
      label: "Maintain Opportunistic",
      detail:
        "Mining margin healthy + risk low — maintain elevated BTC tactical allocation.",
      triggerText:
        conditionByRuleId.get("R3") ?? "R3 — conditions per methodology v1.0",
      armed: true,
      priority: 2,
      variant: "success",
    });
  }

  // 3. Guardrail warnings / breaches
  for (const g of output.btc_tactical.guardrails) {
    if (g.status !== "breached" && g.status !== "warning") continue;
    actions.push({
      ruleId: g.id,
      label: `Review: ${g.label}`,
      detail: g.detail,
      triggerText:
        conditionByRuleId.get(g.id) ??
        `${g.id} — conditions per methodology v1.0`,
      armed: g.status === "breached",
      priority: g.status === "breached" ? 1 : 3,
      variant: g.status === "breached" ? "danger" : "warning",
    });
  }

  // Sort by priority, deduplicate on ruleId, keep max 4
  const sorted = [...actions].sort((a, b) => a.priority - b.priority);
  const seen = new Set<string>();
  const result: RebalancingAction[] = [];
  for (const a of sorted) {
    if (!seen.has(a.ruleId)) {
      seen.add(a.ruleId);
      result.push(a);
    }
    if (result.length >= 4) break;
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RebalancingActionsProps {
  output: ScenarioOutput;
}

export function RebalancingActions({ output }: RebalancingActionsProps) {
  const actions = deriveActions(output);

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader className="mb-3">
          <div className="flex items-center gap-2">
            <CardTitle>Rebalancing Actions</CardTitle>
            <ProvenanceBadge kind="estimated" />
          </div>
          <span className="eyebrow">Max 4 · Rule-based</span>
        </CardHeader>
        <div className="flex items-center gap-3 rounded-[--radius-sm] glass-panel-subtle px-4 py-3">
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[--ct-status-success]"
            aria-hidden
          />
          <p className="text-xs text-[--ct-text-muted]">
            No rebalancing actions triggered — vault allocation is within target bands.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="mb-4">
        <div className="flex items-center gap-2">
          <CardTitle>Rebalancing Actions</CardTitle>
          <ProvenanceBadge kind="estimated" />
        </div>
        <span className="eyebrow">Max 4 · Rule-based</span>
      </CardHeader>

      <ol className="space-y-4">
        {actions.map((action, idx) => (
          <li key={action.ruleId} className="flex gap-3">
            {/* Step number bubble */}
            <span
              className={cn(
                "mt-1 flex h-6 w-6 shrink-0 items-center justify-center",
                "rounded-full text-micro font-bold tabular-nums",
                action.armed
                  ? "bg-[--ct-text-strong] text-[--ct-bg-deep]"
                  : "bg-[--ct-surface-3] text-[--ct-text-muted]",
              )}
              aria-hidden
            >
              {idx + 1}
            </span>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={action.variant} className="text-micro">
                  {action.ruleId}
                </Badge>
              </div>
              <Ptai
                projection={action.label}
                trigger={action.triggerText}
                action={action.detail}
                impact={
                  action.armed
                    ? "Rule armed — subject to governance workflow."
                    : "Advisory — monitor only."
                }
              />
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
