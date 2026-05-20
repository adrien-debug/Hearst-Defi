import { prisma } from "@/lib/db";
import { DistributionForm } from "./distribution-form";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DistributionsPage() {
  const history = await prisma.distribution.findMany({
    orderBy: { distributedAt: "desc" },
    take: 6,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <p className="eyebrow">Admin</p>
        <h1 className="h1">Distributions</h1>
        <p className="body-sm max-w-2xl ct-text-muted">
          Compute and confirm monthly USDC distributions to active investors.
          Requires{" "}
          <strong className="ct-text-body">2 distinct signer approvals</strong>{" "}
          before finalisation.
        </p>
      </header>

      {/* Compute + confirm form (client) */}
      <DistributionForm />

      {/* Distribution history */}
      <section className="space-y-3">
        <h2 className="ct-section-title">History (last 6)</h2>

        {history.length === 0 ? (
          <div className="ct-card text-center py-8 space-y-2">
            <p className="ct-text-muted body-sm">No distributions yet.</p>
            <p className="body-xs ct-text-faint">
              Confirmed distributions will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular border border-[--ct-border-soft] rounded-lg overflow-hidden">
              <thead>
                <tr className="ct-surface-1">
                  <th className="text-left px-4 py-3 body-xs ct-text-muted font-medium">
                    Period
                  </th>
                  <th className="text-right px-4 py-3 body-xs ct-text-muted font-medium">
                    Amount (USDC)
                  </th>
                  <th className="text-right px-4 py-3 body-xs ct-text-muted font-medium">
                    Recipients
                  </th>
                  <th className="text-right px-4 py-3 body-xs ct-text-muted font-medium">
                    Distributed at
                  </th>
                  <th className="text-right px-4 py-3 body-xs ct-text-muted font-medium">
                    Tx hash
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t border-[--ct-border-soft] ct-hover-surface transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs ct-text-body">
                      {d.period}
                    </td>
                    <td className="px-4 py-3 text-right ct-text-strong font-semibold tabular">
                      $
                      {d.amountUsdc.toNumber().toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right ct-text-muted tabular">
                      {d.recipientsCount}
                    </td>
                    <td className="px-4 py-3 text-right ct-text-muted">
                      {formatDate(d.distributedAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs ct-text-faint">
                      {d.txHash
                        ? `${d.txHash.slice(0, 8)}…`
                        : <span className="ct-text-faint">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <p className="body-xs ct-text-faint max-w-2xl">
        Distributions shown above are historical records only. They are not a
        commitment to any future distribution. Past distributions are not a
        reliable indicator of future performance or yield.
      </p>
    </div>
  );
}
