/**
 * ShareClassCompare — side-by-side comparison table for Class A vs Class B.
 *
 * Stateless Server Component. Reads canonical terms from the engine module
 * (src/lib/engine/share-class.ts) — no DB call, no fetch.
 *
 * Cockpit tokens throughout (--ct-*). No forbidden words. No hardcoded hex.
 *
 * Displays: min ticket, lockup, management fee, performance fee, target APY range.
 * Target APY is passed as a prop because it's vault-specific (non-negotiable #1:
 * always a range, never a single point).
 */

import { SHARE_CLASS_A, SHARE_CLASS_B } from "@/lib/engine/share-class";

const usdFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 0,
});

export interface ShareClassCompareProps {
  /**
   * Vault target APY band displayed in the compare table.
   * Both classes share the same vault APY range; fees differ, not the gross APY.
   */
  apyLow: number;
  apyHigh: number;
}

interface Row {
  label: string;
  a: string;
  b: string;
  highlight?: boolean;
}

/**
 * Build comparison rows from canonical class terms.
 * APY range is vault-level (identical for both classes) — the fee structure
 * determines the net distributable, not the gross target band.
 */
function buildRows(apyLow: number, apyHigh: number): Row[] {
  return [
    {
      label: "Min ticket",
      a: usdFull.format(SHARE_CLASS_A.minTicketUsdc),
      b: usdFull.format(SHARE_CLASS_B.minTicketUsdc),
    },
    {
      label: "Soft lock-up",
      a: `${SHARE_CLASS_A.softLockupDays} days`,
      b: `${SHARE_CLASS_B.softLockupDays} days`,
    },
    {
      label: "Mgmt fee (annual)",
      a: `${(SHARE_CLASS_A.mgmtFeeBps / 100).toFixed(2)}%`,
      b: `${(SHARE_CLASS_B.mgmtFeeBps / 100).toFixed(2)}%`,
      highlight: true,
    },
    {
      label: "Carry",
      a: `${(SHARE_CLASS_A.perfFeeBps / 100).toFixed(0)}%`,
      b: `${(SHARE_CLASS_B.perfFeeBps / 100).toFixed(0)}%`,
      highlight: true,
    },
    {
      label: "Target APY range",
      a: `${apyLow.toFixed(1)}–${apyHigh.toFixed(1)}%`,
      b: `${apyLow.toFixed(1)}–${apyHigh.toFixed(1)}%`,
    },
  ];
}

export function ShareClassCompare({ apyLow, apyHigh }: ShareClassCompareProps) {
  const rows = buildRows(apyLow, apyHigh);

  return (
    <article
      className="dash-cell"
      aria-label="Share class comparison"
      data-testid="share-class-compare"
    >
      <div className="dash-label mb-3">
        <span>Share Class Comparison</span>
      </div>

      {/* Disclaimer — non-negotiable #10 */}
      <p className="body-xs text-[var(--ct-text-muted)] mb-4">
        Projections are not guaranteed. Target APY shown as a range; past
        performance does not predict future results.
      </p>

      <div className="overflow-x-auto min-w-0">
        <table
          className="w-full border-collapse"
          role="table"
          aria-label="Class A vs Class B terms"
        >
          <thead>
            <tr>
              <th
                scope="col"
                className="stat-label pb-2 text-left border-b border-[var(--ct-border-soft)]"
              >
                Term
              </th>
              <th
                scope="col"
                className="stat-label pb-2 text-right border-b border-[var(--ct-border-soft)] px-4"
              >
                Class A
              </th>
              <th
                scope="col"
                className="stat-label pb-2 text-right border-b border-[var(--ct-border-soft)] pl-4"
                style={{ color: "var(--ct-accent)" }}
              >
                Class B
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-[var(--ct-border-soft)] last:border-0"
              >
                <td className="body-xs text-[var(--ct-text-muted)] py-2 pr-4">
                  {row.label}
                </td>
                <td
                  className={`tabular body-sm text-right px-4 py-2 ${
                    row.highlight ? "text-[var(--ct-text-body)]" : "text-[var(--ct-text-body)]"
                  }`}
                >
                  {row.a}
                </td>
                <td
                  className={`tabular body-sm text-right pl-4 py-2 font-medium ${
                    row.highlight
                      ? "ct-text-strong"
                      : "text-[var(--ct-text-body)]"
                  }`}
                >
                  {row.b}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
