import Link from "next/link";

import { VaultStatusPill } from "@/components/admin/vault-status-pill";
import { ApyRange } from "@/components/ui/apy-range";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";

import { pauseVault, resumeVault } from "./actions";

export const dynamic = "force-dynamic";

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "review", label: "Review" },
  { key: "live", label: "Live" },
  { key: "paused", label: "Paused" },
  { key: "closed", label: "Closed" },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];

function isFilterKey(v: unknown): v is FilterKey {
  return FILTER_TABS.some((t) => t.key === v);
}

const STRATEGY_LABELS: Record<string, string> = {
  mining_yield: "Mining Yield",
  btc_tactical: "BTC Tactical",
  stable_reserve: "Stable Reserve",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VaultsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const rawFilter = params["filter"];
  const activeFilter: FilterKey = isFilterKey(rawFilter) ? rawFilter : "all";

  const vaults = await prisma.vaultDeployment.findMany({
    where: activeFilter === "all" ? {} : { status: activeFilter },
    orderBy: { updatedAt: "desc" },
    include: {
      positions: {
        where: { status: "active" },
        select: { principalUsdc: true },
      },
    },
  });

  return (
    <section className="ct-section space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow">Admin</p>
          <h1 className="h1">Vault Deployments</h1>
        </div>
        <Button variant="primary" asChild size="md">
          <Link href="/admin/vaults/new">+ New deployment</Link>
        </Button>
      </header>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter vaults by status">
        {FILTER_TABS.map((tab) => {
          const isActive = tab.key === activeFilter;
          return (
            <Link
              key={tab.key}
              href={tab.key === "all" ? "/admin/vaults" : `/admin/vaults?filter=${tab.key}`}
              role="tab"
              aria-selected={isActive}
              className={
                isActive
                  ? "ct-pill accent text-xs font-semibold uppercase tracking-wide"
                  : "ct-pill text-xs font-semibold uppercase tracking-wide"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* List */}
      {vaults.length === 0 ? (
        <Card>
          <p className="body-md text-[--ct-text-muted] text-center py-8">
            No deployments found.{" "}
            <Link href="/admin/vaults/new" className="text-[--ct-text-primary] underline underline-offset-2">
              Create the first one.
            </Link>
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {vaults.map((vault) => {
            const aumUsdc = vault.positions.reduce(
              (sum, p) => sum + Number(p.principalUsdc),
              0,
            );
            const capacityUsdc = Number(vault.capacityUsdc);
            const aumPct = capacityUsdc > 0 ? (aumUsdc / capacityUsdc) * 100 : 0;
            const apyLow = Number(vault.targetApyLowBps) / 100;
            const apyHigh = Number(vault.targetApyHighBps) / 100;

            return (
              <Card key={vault.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Identity */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="mono tabular text-sm font-semibold text-[--ct-text-strong]">
                          {vault.ticker}
                        </span>
                        <VaultStatusPill status={vault.status} />
                      </div>
                      <p className="body-sm text-[--ct-text-muted] truncate max-w-xs">
                        {vault.name}
                      </p>
                      <p className="body-xs text-[--ct-text-faint]">
                        {STRATEGY_LABELS[vault.strategy] ?? vault.strategy}
                      </p>
                    </div>
                  </div>

                  {/* AUM progress */}
                  <div className="flex flex-col gap-1 min-w-36">
                    <span className="stat-label">AUM vs Capacity</span>
                    <Progress value={aumPct} label="AUM vs capacity" />
                    <span className="mono tabular text-xs text-[--ct-text-muted]">
                      ${aumUsdc.toLocaleString()} / ${capacityUsdc.toLocaleString()}
                    </span>
                  </div>

                  {/* APY */}
                  <div className="flex flex-col gap-0.5">
                    <span className="stat-label">Target APY</span>
                    <ApyRange low={apyLow} high={apyHigh} precision={1} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/vaults/${vault.id}`}>View</Link>
                    </Button>

                    {vault.status === "live" && (
                      <form
                        action={async () => {
                          "use server";
                          await pauseVault(vault.id);
                        }}
                      >
                        <Button variant="secondary" size="sm" type="submit">
                          Pause
                        </Button>
                      </form>
                    )}

                    {vault.status === "paused" && (
                      <form
                        action={async () => {
                          "use server";
                          await resumeVault(vault.id);
                        }}
                      >
                        <Button variant="secondary" size="sm" type="submit">
                          Resume
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
