"use client";

// TimeToTargetChart — SVG removed, placeholder only.
// Non-negotiable #5: no forbidden words in labels.
// Non-negotiable #10: "not guaranteed" disclaimer mandatory.

import { monthsToTarget } from "@/lib/demo/projection";
import type { VaultProduct } from "@/lib/data/vaults";

interface TimeToTargetChartProps {
  amount: number; // USDC
  vault: VaultProduct;
}

const CHART_MONTHS = 24;
const TARGET_CUMULATIVE_PCT = 10; // 10% cumulative yield as "milestone"

export function TimeToTargetChart({ vault }: TimeToTargetChartProps) {
  const midApy = (vault.apyLow + vault.apyHigh) / 2;
  const months10pct = monthsToTarget(midApy, TARGET_CUMULATIVE_PCT, CHART_MONTHS);

  return (
    <div className="space-y-2">
      <div
        className="w-full rounded-[var(--ct-radius-md)] bg-[var(--ct-surface-1)] border border-[var(--ct-border-soft)]"
        style={{ height: "160px" }}
        aria-label="Projected NAV growth chart"
        role="img"
      />

      {months10pct !== null && (
        <p className="body-xs ct-text-faint text-center">
          +{TARGET_CUMULATIVE_PCT}% cumulative yield milestone at month {months10pct}
        </p>
      )}

      <p className="body-xs ct-text-faint text-center">
        Conditional projection — not a projection of future returns. Methodology v1.0.
      </p>
    </div>
  );
}
