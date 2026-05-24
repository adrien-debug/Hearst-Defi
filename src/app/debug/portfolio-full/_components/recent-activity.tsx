import type { PortfolioTransaction } from "@/lib/data/portfolio";

import { ProvenanceBadge } from "./provenance-badge";

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

function TxIcon({ type }: { type: string }) {
  const colorClass =
    type === "deposit"
      ? "bg-[var(--ct-status-success)]"
      : type === "distribution"
        ? "bg-[var(--ct-accent-strong)]"
        : type === "withdraw"
          ? "bg-[var(--ct-status-danger)]"
          : "bg-[var(--ct-text-muted)]";

  return (
    <span
      aria-hidden="true"
      className={`inline-block w-4 h-4 rounded-sm shrink-0 ${colorClass}`}
    />
  );
}

interface RecentActivityProps {
  transactions: PortfolioTransaction[];
  source: "live" | "fallback";
}

export function RecentActivity({ transactions, source }: RecentActivityProps) {
  const provenance = source === "fallback" ? "stale" : "live";
  const asOf = new Date("2026-05-20T09:00:00Z");
  const displayed = transactions.slice(0, 5);

  return (
    <article className="dash-cell" aria-label="Recent account activity">
      <div className="dash-label">
        <span>Recent Activity</span>
        <ProvenanceBadge kind={provenance} />
      </div>

      {displayed.length === 0 ? (
        <p className="body-sm ct-text-muted mt-4">No transactions yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5 mt-3">
          {displayed.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 py-2 border-b border-[var(--ct-border-soft)]"
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
