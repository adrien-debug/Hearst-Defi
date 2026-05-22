import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import type { PortfolioTransaction } from "@/lib/data/portfolio";

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  claim: "Claim",
  withdraw: "Withdrawal",
  distribution: "Distribution",
};

/** Returns a relative time string like "3 days ago", "1 month ago". */
function relativeTime(date: Date, asOf: Date): string {
  const diffMs = asOf.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
}

// SVG icon paths for each tx type (16×16 viewport, token-only strokes).
function TxIcon({ type }: { type: string }) {
  const iconStyle = {
    flexShrink: 0 as const,
    color:
      type === "deposit"
        ? "var(--ct-status-success)"
        : type === "distribution"
          ? "var(--ct-accent-strong)"
          : type === "withdraw"
            ? "var(--ct-status-danger)"
            : "var(--ct-text-muted)",
  };
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={iconStyle}
    >
      {type === "deposit" && (
        <path
          d="M8 2v9M4 7l4 4 4-4M3 13h10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {type === "withdraw" && (
        <path
          d="M8 14V5M4 9l4-4 4 4M3 3h10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {type === "distribution" && (
        <path
          d="M8 2a6 6 0 110 12A6 6 0 018 2zM8 6v2l1.5 1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {type === "claim" && (
        <path
          d="M3 8h10M9 5l4 3-4 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

interface RecentActivityProps {
  transactions: PortfolioTransaction[];
  source: "live" | "fallback";
}

/**
 * 5 latest transactions with icon, type, amount, and relative time.
 * ProvenanceBadge on the header (CLAUDE.md non-negotiable #2).
 */
export function RecentActivity({ transactions, source }: RecentActivityProps) {
  const provenance = source === "fallback" ? "stale" : "live";
  // Anchor relative time to a fixed server timestamp — stable across renders.
  const asOf = new Date("2026-05-20T09:00:00Z");
  const displayed = transactions.slice(0, 5);

  return (
    <article className="dash-cell" aria-label="Recent account activity">
      <div className="dash-label">
        <span>Recent Activity</span>
        <ProvenanceBadge kind={provenance} />
      </div>

      {displayed.length === 0 ? (
        <p className="body-sm ct-text-muted mt-4">
          No transactions yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 mt-3">
          {displayed.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 py-2 border-b border-[--ct-border-soft]"
            >
              <TxIcon type={tx.type} />

              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="body-xs ct-text-primary font-semibold truncate">
                  {TYPE_LABELS[tx.type] ?? tx.type}
                  {tx.positionVaultName && (
                    <span className="ct-text-muted font-normal">
                      {" "}· {tx.positionVaultName}
                    </span>
                  )}
                </div>
                <div className="stat-label ct-text-muted mt-0.5 mono truncate">
                  {relativeTime(tx.occurredAt, asOf)}
                </div>
              </div>

              <span className="tabular body-md ct-text-strong mono font-semibold shrink-0">
                {usdFmt.format(tx.amountUsdc)}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
