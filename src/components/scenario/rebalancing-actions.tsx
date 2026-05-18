import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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

  // 1. BTC tactical armed triggers first
  for (const trigger of output.btc_tactical.triggers) {
    if (!trigger.armed) continue;
    actions.push({
      ruleId: trigger.id,
      label: KIND_LABEL[trigger.kind],
      detail: trigger.action,
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

  if (actions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="mb-4">
        <CardTitle>Rebalancing Actions</CardTitle>
        <span className="eyebrow">Max 4 · Rule-based</span>
      </CardHeader>

      <ol className="space-y-3">
        {actions.map((action, idx) => (
          <li
            key={action.ruleId}
            className={cn(
              "flex gap-4 rounded-[--radius-sm] border border-[--ct-border-soft]",
              "bg-[--ct-surface-1] px-4 py-3",
            )}
          >
            {/* Step number bubble */}
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center",
                "rounded-full text-[--text-micro] font-bold tabular-nums",
                action.armed
                  ? "bg-[--ct-text-strong] text-[--ct-bg-deep]"
                  : "bg-[--ct-surface-3] text-[--ct-text-muted]",
              )}
              aria-hidden
            >
              {idx + 1}
            </span>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[--ct-text-primary]">
                  {action.label}
                </span>
                <Badge variant={action.variant} className="text-[--text-micro]">
                  {action.ruleId}
                </Badge>
              </div>
              <p className="text-xs text-[--ct-text-body]">
                {action.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
