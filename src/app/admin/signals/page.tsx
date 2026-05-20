import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { RebalanceCard } from "@/components/admin/rebalance-card";
import { cn } from "@/lib/cn";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter = "pending" | "approved" | "executed" | "cancelled" | "all";

const VALID_STATUSES: StatusFilter[] = [
  "all",
  "pending",
  "approved",
  "executed",
  "cancelled",
];

function toFilter(raw: unknown): StatusFilter {
  if (typeof raw === "string" && VALID_STATUSES.includes(raw as StatusFilter)) {
    return raw as StatusFilter;
  }
  return "pending";
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

const TABS: { label: string; value: StatusFilter }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Executed", value: "executed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "All", value: "all" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface SignalsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function SignalsPage({ searchParams }: SignalsPageProps) {
  const params = await searchParams;
  const activeStatus = toFilter(params.status);

  const where: Prisma.RebalanceEventWhereInput =
    activeStatus === "all" ? {} : { status: activeStatus };

  const events = await prisma.rebalanceEvent.findMany({
    where,
    orderBy: { triggeredAt: "desc" },
    take: 100,
  });

  // Count badges per status
  const counts = await prisma.rebalanceEvent.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const countMap = Object.fromEntries(
    counts.map((c) => [c.status, c._count.id]),
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <p className="eyebrow">Admin</p>
        <h1 className="h1">Rebalance signals</h1>
        <p className="body-sm max-w-2xl ct-text-muted">
          Review engine-triggered rebalance signals. Each signal requires{" "}
          <strong className="ct-text-body">2 distinct signer approvals</strong>{" "}
          before execution. Actions are off-chain at MVP.
        </p>
      </header>

      {/* Filter tabs */}
      <nav
        className="flex gap-1 ct-seg-track"
        aria-label="Signal status filter"
      >
        {TABS.map((tab) => {
          const count = tab.value === "all"
            ? Object.values(countMap).reduce((a, b) => a + b, 0)
            : (countMap[tab.value] ?? 0);

          return (
            <Link
              key={tab.value}
              href={`/admin/signals?status=${tab.value}`}
              className={cn(
                "ct-seg-btn",
                activeStatus === tab.value && "active",
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 ct-pill text-xs">{count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Event list */}
      {events.length === 0 ? (
        <div className="ct-card text-center py-12 space-y-2">
          <p className="ct-text-muted body-sm">
            No rebalance signals with status &quot;{activeStatus}&quot;.
          </p>
          <p className="body-xs ct-text-faint">
            Signals are created automatically by the Inngest rebalancing-signal
            function when engine rules fire.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          <p className="stat-label">
            {events.length} signal{events.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-4">
            {events.map((event) => (
              <RebalanceCard key={event.id} event={event} requiredSigners={2} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
