/**
 * PnlTable — per-position P&L breakdown for /portfolio.
 *
 * Server Component (no "use client" directive).
 * Columns: Vault | Class | Cost basis | Current NAV | Unrealized P&L |
 *          Realized P&L | IRR | Lock release date
 *
 * Sorted by totalReturn desc (done by getPositions at the data layer).
 *
 * ProvenanceBadge "Live" on Current NAV, "Estimated" on IRR.
 * APY never shown here (this is P&L, not yield projection).
 * Forbidden words enforced: no "guarantee", "promise", "certain",
 * "will deliver", "risk-free".
 *
 * Design: Cockpit tokens only — no raw hex.
 */

import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import type { PositionPnl } from "@/lib/portfolio/positions";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Formatters — pure, deterministic (SSR + client safe)
// ---------------------------------------------------------------------------

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatUsdc(value: number): string {
  return usdFmt.format(value);
}

function formatPnl(value: number): string {
  const formatted = usdFmt.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${usdFmt.format(Math.abs(value))}`;
  return formatted;
}

function formatIrr(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function pnlColor(value: number): string {
  if (value > 0) return "text-[var(--ct-status-success)]";
  if (value < 0) return "text-[var(--ct-status-danger)]";
  return "text-[var(--ct-text-body)]";
}

// ---------------------------------------------------------------------------
// Column header
// ---------------------------------------------------------------------------

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "py-2 px-3 text-left text-[length:var(--ct-text-micro)] font-semibold uppercase tracking-[var(--ct-tracking-wide)] text-[var(--ct-text-muted)] whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "py-3 px-3 text-[length:var(--ct-text-sm)] text-[var(--ct-text-body)] tabular-nums",
        className,
      )}
    >
      {children}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface PnlTableProps {
  positions: PositionPnl[];
}

/**
 * Renders a scrollable P&L table sorted by totalReturn desc.
 * Accepts the pre-fetched `PositionPnl[]` array from `getPositions`.
 */
export function PnlTable({ positions }: PnlTableProps) {
  if (positions.length === 0) {
    return (
      <article
        className="dash-cell"
        aria-label="P&L per position"
        data-testid="pnl-table"
      >
        <div className="dash-label">
          <span>P&amp;L per Position</span>
        </div>
        <p className="body-sm text-[var(--ct-text-muted)] mt-4">
          No positions yet. Data will appear once your first position is active.
        </p>
        {/* Not a guarantee — projections are not guaranteed results. */}
      </article>
    );
  }

  return (
    <article
      className="dash-cell"
      aria-label="P&L per position"
      data-testid="pnl-table"
    >
      {/* Header */}
      <div className="dash-label mb-4">
        <span>P&amp;L per Position</span>
        <span className="dash-label-meta text-[var(--ct-text-muted)] text-[length:var(--ct-text-xs)]">
          {positions.length} position{positions.length !== 1 ? "s" : ""}
          {" · "}sorted by total return
        </span>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto -mx-1">
        <table
          className="w-full min-w-[720px] border-collapse"
          aria-label="P&L breakdown by vault and share class"
        >
          <thead>
            <tr className="border-b border-[var(--ct-border-soft)]">
              <Th>Vault</Th>
              <Th className="text-center">Class</Th>
              <Th className="text-right">Cost Basis</Th>
              <Th className="text-right">
                <span className="inline-flex items-center gap-1.5">
                  Current NAV
                  <ProvenanceBadge kind="live" />
                </span>
              </Th>
              <Th className="text-right">Unrealized P&amp;L</Th>
              <Th className="text-right">Realized P&amp;L</Th>
              <Th className="text-right">
                <span className="inline-flex items-center gap-1.5">
                  IRR
                  <ProvenanceBadge kind="estimated" />
                </span>
              </Th>
              <Th className="text-right">Lock Release</Th>
            </tr>
          </thead>

          <tbody>
            {positions.map((pos) => (
              <tr
                key={pos.id}
                className="border-b border-[var(--ct-border-soft)] last:border-b-0 hover:bg-[var(--ct-surface-1)] transition-colors"
                data-position-id={pos.id}
              >
                {/* Vault */}
                <Td>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-[var(--ct-text-strong)] leading-tight">
                      {pos.vaultName}
                    </span>
                    <span className="text-[length:var(--ct-text-xs)] text-[var(--ct-text-muted)]">
                      {pos.vaultTicker}
                    </span>
                  </div>
                </Td>

                {/* Share class */}
                <Td className="text-center">
                  <span className="inline-block rounded-[var(--ct-radius-sm)] bg-[var(--ct-surface-2)] px-2 py-0.5 text-[length:var(--ct-text-xs)] font-semibold uppercase tracking-wide text-[var(--ct-text-body)]">
                    {pos.shareClass}
                  </span>
                </Td>

                {/* Cost basis */}
                <Td className="text-right font-medium text-[var(--ct-text-body)]">
                  {formatUsdc(pos.costBasisUsdc)}
                </Td>

                {/* Current NAV */}
                <Td className="text-right font-semibold text-[var(--ct-text-strong)]">
                  {formatUsdc(pos.currentNavUsdc)}
                </Td>

                {/* Unrealized P&L */}
                <Td
                  className={cn("text-right font-medium", pnlColor(pos.unrealizedPnlUsdc))}
                >
                  {formatPnl(pos.unrealizedPnlUsdc)}
                </Td>

                {/* Realized P&L */}
                <Td
                  className={cn("text-right font-medium", pnlColor(pos.realizedPnlUsdc))}
                >
                  {formatPnl(pos.realizedPnlUsdc)}
                </Td>

                {/* IRR — Estimated provenance shown in column header */}
                <Td
                  className={cn(
                    "text-right font-medium",
                    pos.irrAnnualized !== null
                      ? pnlColor(pos.irrAnnualized)
                      : "text-[var(--ct-text-muted)]",
                  )}
                >
                  {formatIrr(pos.irrAnnualized)}
                </Td>

                {/* Lock release date */}
                <Td className="text-right text-[var(--ct-text-muted)]">
                  {dateFmt.format(pos.lockReleaseDate)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Not-guaranteed disclaimer (CLAUDE.md non-negotiable #10) */}
      <p className="mt-3 text-[length:var(--ct-text-xs)] text-[var(--ct-text-faint)]">
        IRR is an approximation based on current accrued values. Past
        performance and projected returns are not an indication of future results
        and are not assured.
      </p>
    </article>
  );
}
