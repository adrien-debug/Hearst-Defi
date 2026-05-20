// PositionTransactions — transactions table for /portfolio/[positionId]
// Server Component.
// Shows up to 50 rows: Date · Type icon · Amount (signed) · Tx hash (BaseScan link).

import type { PositionDetailTransaction } from "@/lib/data/portfolio";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";

const usdSigned = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hour12: false,
});

type TxType = PositionDetailTransaction["type"];

const TYPE_ICON: Record<TxType, string> = {
  deposit: "↓",
  claim: "↑",
  withdraw: "↑",
  distribution: "⊕",
};

const TYPE_LABEL: Record<TxType, string> = {
  deposit: "Deposit",
  claim: "Claim",
  withdraw: "Withdraw",
  distribution: "Distribution",
};

/** Returns true when the transaction represents money flowing in (positive). */
function isIncoming(type: TxType): boolean {
  return type === "deposit";
}

interface PositionTransactionsProps {
  transactions: PositionDetailTransaction[];
  source: "live" | "fallback";
}

/**
 * Transaction history table.
 * Filter chips are visual-only at MVP — interactivity can be added later.
 */
export function PositionTransactions({
  transactions,
  source,
}: PositionTransactionsProps) {
  const provenance = source === "live" ? "live" : "stale";

  // Filter chip categories (visual-only)
  const chips: TxType[] = ["deposit", "claim", "withdraw", "distribution"];

  return (
    <section
      aria-label="Transaction history"
      className="ct-card"
      style={{ display: "flex", flexDirection: "column", gap: "var(--ct-space-4)" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--ct-space-3)",
        }}
      >
        <span
          className="eyebrow"
          style={{ color: "var(--ct-text-muted)" }}
        >
          Transaction history
        </span>
        <ProvenanceBadge kind={provenance} />
      </div>

      {/* Visual filter chips — display only */}
      <div
        style={{
          display: "flex",
          gap: "var(--ct-space-2)",
          flexWrap: "wrap",
        }}
        aria-label="Filter options (display only)"
      >
        {chips.map((c) => (
          <span
            key={c}
            className="ct-pill body-xs"
            style={{ cursor: "default" }}
          >
            {TYPE_LABEL[c]}
          </span>
        ))}
      </div>

      {transactions.length === 0 ? (
        <p
          className="body-sm"
          style={{ color: "var(--ct-text-muted)", marginTop: "var(--ct-space-2)" }}
        >
          No transactions recorded yet.
        </p>
      ) : (
        <div
          style={{
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "var(--ct-text-sm)",
            }}
          >
            <thead>
              <tr className="stat-label ct-text-muted border-b border-[--ct-border-soft]">
                <th className="text-left pb-[var(--ct-space-2)] font-[inherit]">Date</th>
                <th className="text-left pb-[var(--ct-space-2)] font-[inherit]">Type</th>
                <th className="text-right pb-[var(--ct-space-2)] font-[inherit]">Amount</th>
                <th className="text-right pb-[var(--ct-space-2)] font-[inherit]">Tx</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const incoming = isIncoming(tx.type);
                return (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: "1px solid var(--ct-border-soft)",
                    }}
                  >
                    {/* Date */}
                    <td
                      className="tabular body-xs ct-text-muted"
                      style={{
                        padding: "var(--ct-space-2) 0",
                        fontFamily: "var(--font-mono)",
                        whiteSpace: "nowrap",
                        paddingRight: "var(--ct-space-4)",
                      }}
                    >
                      {dateFmt.format(tx.occurredAt)}
                    </td>

                    {/* Type + icon */}
                    <td
                      style={{
                        padding: "var(--ct-space-2) 0",
                        paddingRight: "var(--ct-space-4)",
                      }}
                    >
                      <span
                        className="body-xs ct-text-body"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "var(--ct-space-1_5)",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className={incoming ? "ct-text-muted body-xs" : "ct-status-success body-xs"}
                        >
                          {TYPE_ICON[tx.type]}
                        </span>
                        {TYPE_LABEL[tx.type]}
                      </span>
                    </td>

                    {/* Amount — signed, accent for yield/dist, muted for deposits */}
                    <td
                      className={`tabular body-md ${incoming ? "ct-text-primary" : "ct-status-success"}`}
                      style={{
                        padding: "var(--ct-space-2) 0",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: "var(--ct-font-semibold)",
                        paddingRight: "var(--ct-space-4)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {incoming ? "" : "+"}
                      {usdSigned.format(tx.amountUsdc)}
                    </td>

                    {/* Tx hash */}
                    <td
                      style={{
                        padding: "var(--ct-space-2) 0",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tx.txHash ? (
                        <a
                          href={`https://basescan.org/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tabular body-xs"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: "var(--ct-accent-strong)",
                            textDecoration: "none",
                            transition: "opacity var(--ct-dur-fast) var(--ct-ease)",
                          }}
                          title={tx.txHash}
                        >
                          {tx.txHash.slice(0, 6)}&hellip;{tx.txHash.slice(-4)} ↗
                        </a>
                      ) : (
                        <span
                          className="body-xs"
                          style={{ color: "var(--ct-text-faint)" }}
                        >
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
