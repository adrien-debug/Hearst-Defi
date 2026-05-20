import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { ApyRange } from "@/components/ui/apy-range";
import type { PortfolioPosition } from "@/lib/data/portfolio";

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const STATUS_DOT: Record<string, string> = {
  active: "var(--ct-status-success)",
  matured: "var(--ct-text-muted)",
  exited: "var(--ct-accent-strong)",
};

interface PositionsListProps {
  positions: PortfolioPosition[];
  source: "live" | "fallback";
}

/**
 * Positions table.
 * ApyRange is used on every APY display (CLAUDE.md non-negotiable #1).
 * ProvenanceBadge on the header metric (CLAUDE.md non-negotiable #2).
 */
export function PositionsList({ positions, source }: PositionsListProps) {
  const provenance = source === "fallback" ? "stale" : "live";

  return (
    <article className="dash-cell col-8" aria-label="Open positions">
      <div className="dash-label">
        <span>Positions</span>
        <span className="dash-label-meta">
          <ProvenanceBadge kind={provenance} />
          <span className="dash-trend flat">{positions.length} position{positions.length !== 1 ? "s" : ""}</span>
        </span>
      </div>

      {positions.length === 0 ? (
        <p className="body-sm ct-text-muted" style={{ marginTop: "var(--ct-space-4)" }}>
          No open positions.
        </p>
      ) : (
        <div
          style={{
            marginTop: "var(--ct-space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--ct-space-2)",
          }}
        >
          {/* Header row */}
          <div
            className="stat-label"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto auto",
              gap: "var(--ct-space-4)",
              paddingBottom: "var(--ct-space-2)",
              borderBottom: "1px solid var(--ct-border-soft)",
            }}
          >
            <span>Vault</span>
            <span style={{ textAlign: "right" }}>Principal</span>
            <span style={{ textAlign: "right" }}>Value</span>
            <span style={{ textAlign: "right" }}>Target APY</span>
            <span style={{ textAlign: "right" }}>Since</span>
          </div>

          {positions.map((p) => (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto auto",
                gap: "var(--ct-space-4)",
                alignItems: "center",
                paddingBottom: "var(--ct-space-2)",
                borderBottom: "1px solid var(--ct-border-soft)",
              }}
            >
              {/* Vault name + status */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--ct-space-2)", minWidth: 0 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: "var(--ct-space-2)",
                    height: "var(--ct-space-2)",
                    borderRadius: "50%",
                    background: STATUS_DOT[p.status] ?? "var(--ct-text-muted)",
                    flexShrink: 0,
                  }}
                />
                <span className="body-md ct-text-primary min-w-0 truncate">
                  {p.vaultName}
                </span>
              </div>

              {/* Principal */}
              <span className="tabular body-md mono text-right text-[--ct-text-body]">
                {usdCompact.format(p.principalUsdc)}
              </span>

              {/* Current value */}
              <span
                className="tabular body-md ct-text-strong"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: "var(--ct-font-semibold)",
                  textAlign: "right",
                }}
              >
                {usdCompact.format(p.valueUsdc)}
              </span>

              {/* APY range — non-negotiable #1 */}
              <div style={{ textAlign: "right" }}>
                <ApyRange low={p.apyLow} high={p.apyHigh} precision={1} />
              </div>

              {/* Subscribed date */}
              <span
                className="body-xs tabular ct-text-muted"
                style={{
                  fontFamily: "var(--font-mono)",
                  textAlign: "right",
                }}
              >
                {dateFmt.format(p.subscribedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
