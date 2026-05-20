// PositionHeader — top section of /portfolio/[positionId]
// Server Component. Shows vault name, position ID, status pill, total value + delta vs principal.
// Non-negotiable #2: ProvenanceBadge on the total value metric.

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import type { PositionDetail } from "@/lib/data/portfolio";

const usdFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type StatusVariant = "success" | "warning" | "default";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  active: "success",
  matured: "warning",
  exited: "default",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  matured: "Matured",
  exited: "Exited",
};

interface PositionHeaderProps {
  position: PositionDetail;
}

/**
 * Header block: back link, vault name + position id, status pill,
 * total value with delta vs principal.
 */
export function PositionHeader({ position }: PositionHeaderProps) {
  const totalValue = position.principalUsdc + position.accruedYieldUsdc;
  const delta = totalValue - position.principalUsdc;
  const deltaSign = delta >= 0 ? "+" : "";
  const deltaPct =
    position.principalUsdc > 0
      ? (delta / position.principalUsdc) * 100
      : 0;

  const provenance = position.source === "live" ? "live" : "stale";

  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--ct-space-4)",
      }}
    >
      {/* Back link */}
      <Link
        href="/portfolio"
        className="body-sm ct-text-muted"
        style={{
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--ct-space-1)",
          transition: "color var(--ct-dur-fast) var(--ct-ease)",
        }}
      >
        ← Portfolio
      </Link>

      {/* Title row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--ct-space-3)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--ct-space-1)",
          }}
        >
          <h2
            className="h2 ct-text-strong"
            style={{ margin: 0 }}
          >
            {position.vaultName}
          </h2>
          <span
            className="eyebrow tabular ct-text-muted"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {position.vaultTicker} ·{" "}
            <span title={position.id}>{position.id.slice(0, 8)}&hellip;</span>
          </span>
        </div>

        <Badge variant={STATUS_VARIANT[position.status] ?? "default"}>
          {STATUS_LABEL[position.status] ?? position.status}
        </Badge>
      </div>

      {/* Total value */}
      <div
        className="ct-card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--ct-space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--ct-space-1)",
          }}
        >
          <span className="eyebrow ct-text-muted">
            Total value
          </span>
          <span
            className="stat-value tabular ct-text-strong"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {usdFull.format(totalValue)}
          </span>
          {delta !== 0 && (
            <span
              className="body-sm tabular"
              style={{
                color:
                  delta >= 0
                    ? "var(--ct-status-success)"
                    : "var(--ct-status-danger)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {deltaSign}
              {usdFull.format(delta)} · {deltaSign}
              {deltaPct.toFixed(1)}%
            </span>
          )}
        </div>
        <ProvenanceBadge kind={provenance} />
      </div>
    </header>
  );
}
