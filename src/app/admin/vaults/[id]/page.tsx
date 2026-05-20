import Link from "next/link";
import { notFound } from "next/navigation";

import { VaultStatusPill } from "@/components/admin/vault-status-pill";
import { ApyRange } from "@/components/ui/apy-range";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";

import {
  closeVault,
  markAsLive,
  pauseVault,
  resumeVault,
  signApproval,
  submitForReview,
} from "../actions";

export const dynamic = "force-dynamic";

const STRATEGY_LABELS: Record<string, string> = {
  mining_yield: "Mining Yield",
  btc_tactical: "BTC Tactical",
  stable_reserve: "Stable Reserve",
};

const REG_LABELS: Record<string, string> = {
  regD_506c: "Reg D 506(c)",
  regS: "Reg S",
  art2_lux: "Art. 2 Lux",
};

const SPV_LABELS: Record<string, string> = {
  cayman: "Cayman Islands",
  bvi: "British Virgin Islands",
  delaware: "Delaware",
  lux: "Luxembourg",
};

function pct(bps: number) {
  return (bps / 100).toFixed(1);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VaultDetailPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { id } = await params;

  const vault = await prisma.vaultDeployment.findUnique({
    where: { id },
    include: {
      approvals: { orderBy: { signedAt: "asc" } },
      positions: { where: { status: "active" }, select: { principalUsdc: true } },
    },
  });

  if (!vault) notFound();

  const aumUsdc = vault.positions.reduce((sum, p) => sum + Number(p.principalUsdc), 0);
  const capacityUsdc = Number(vault.capacityUsdc);
  const aumPct = capacityUsdc > 0 ? (aumUsdc / capacityUsdc) * 100 : 0;
  const apyLow = Number(vault.targetApyLowBps) / 100;
  const apyHigh = Number(vault.targetApyHighBps) / 100;

  const whitelist: string[] = JSON.parse(vault.signersWhitelist) as string[];
  const actorWallet = admin.walletAddress ?? admin.userId;
  const alreadySigned = vault.approvals.some((a) => a.signerWallet === actorWallet);
  const approveCount = vault.approvals.filter((a) => a.decision === "approve").length;

  return (
    <section className="ct-section space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/vaults">← Vaults</Link>
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="mono tabular text-lg font-semibold text-[--ct-text-strong]">
              {vault.ticker}
            </span>
            <VaultStatusPill status={vault.status} />
          </div>
          <h1 className="h1">{vault.name}</h1>
          {vault.description && (
            <p className="body-md text-[--ct-text-muted] max-w-xl">{vault.description}</p>
          )}
        </div>

        {/* Status actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {vault.status === "draft" && (
            <>
              <Button variant="secondary" size="md" asChild>
                <Link href={`/admin/vaults/${id}/edit`}>Edit</Link>
              </Button>
              <form
                action={async () => {
                  "use server";
                  await submitForReview(id);
                }}
              >
                <Button variant="primary" size="md" type="submit">
                  Submit for Review
                </Button>
              </form>
            </>
          )}

          {vault.status === "review" && whitelist.includes(actorWallet) && !alreadySigned && (
            <>
              <form
                action={async () => {
                  "use server";
                  await signApproval(id, "approve");
                }}
              >
                <Button variant="primary" size="md" type="submit">
                  Sign Approval
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await signApproval(id, "reject", "Rejected via admin UI");
                }}
              >
                <Button variant="danger" size="md" type="submit">
                  Sign Rejection
                </Button>
              </form>
            </>
          )}

          {vault.status === "deployed" && (
            <form
              action={async () => {
                "use server";
                await markAsLive(id);
              }}
            >
              <Button variant="primary" size="md" type="submit">
                Mark as Live
              </Button>
            </form>
          )}

          {vault.status === "live" && (
            <form
              action={async () => {
                "use server";
                await pauseVault(id);
              }}
            >
              <Button variant="secondary" size="md" type="submit">
                Pause
              </Button>
            </form>
          )}

          {vault.status === "paused" && (
            <>
              <form
                action={async () => {
                  "use server";
                  await resumeVault(id);
                }}
              >
                <Button variant="primary" size="md" type="submit">
                  Resume
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await closeVault(id);
                }}
              >
                <Button variant="danger" size="md" type="submit">
                  Close Vault
                </Button>
              </form>
            </>
          )}
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <span className="stat-label block mb-1">Target APY</span>
          <ApyRange low={apyLow} high={apyHigh} precision={1} />
          <p className="body-xs text-[--ct-text-faint] mt-1">Not guaranteed — estimated</p>
        </Card>

        <Card>
          <span className="stat-label block mb-1">Fees</span>
          <span className="mono tabular text-base font-semibold text-[--ct-text-strong]">
            {pct(vault.mgmtFeeBps)}% / {pct(vault.perfFeeBps)}%
          </span>
          <p className="body-xs text-[--ct-text-faint] mt-1">Mgmt / Perf</p>
        </Card>

        <Card>
          <span className="stat-label block mb-1">Lock-up</span>
          <span className="mono tabular text-base font-semibold text-[--ct-text-strong]">
            {vault.softLockupDays}d
          </span>
          <p className="body-xs text-[--ct-text-faint] mt-1">Soft lock-up</p>
        </Card>

        {vault.status === "live" && (
          <Card>
            <span className="stat-label block mb-1">AUM</span>
            <span className="mono tabular text-base font-semibold text-[--ct-text-strong]">
              ${aumUsdc.toLocaleString()}
            </span>
            <div className="mt-2">
              <Progress value={aumPct} label="AUM vs capacity" />
            </div>
            <p className="body-xs text-[--ct-text-faint] mt-1">
              / ${capacityUsdc.toLocaleString()} capacity
            </p>
          </Card>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Legal */}
        <Card>
          <CardHeader>
            <CardTitle>Legal</CardTitle>
          </CardHeader>
          <dl className="space-y-3">
            {(
              [
                ["Strategy", STRATEGY_LABELS[vault.strategy] ?? vault.strategy],
                ["SPV", SPV_LABELS[vault.spvJurisdiction] ?? vault.spvJurisdiction],
                ["Share Class", vault.shareClass],
                ["Reg Exemption", REG_LABELS[vault.regExemption] ?? vault.regExemption],
                ["Min Ticket", `$${Number(vault.minTicketUsdc).toLocaleString()} USDC`],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <dt className="stat-label">{label}</dt>
                <dd className="body-sm text-[--ct-text-primary] text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Allocation policy */}
        <Card>
          <CardHeader>
            <CardTitle>Allocation Policy</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {(
              [
                ["Mining", vault.targetMiningBps],
                ["BTC Tactical", vault.targetBtcTacticalBps],
                ["USDC Base", vault.targetUsdcBaseBps],
                ["Stable Reserve", vault.targetStableReserveBps],
              ] as [string, number][]
            ).map(([label, bps]) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="stat-label">{label}</span>
                  <span className="mono tabular text-sm text-[--ct-text-primary]">
                    {pct(bps)}%
                  </span>
                </div>
                <Progress value={bps} max={10000} label={`${label} allocation`} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Approvals */}
      <Card>
        <CardHeader>
          <CardTitle>Approvals</CardTitle>
          <span className="mono tabular text-sm text-[--ct-text-muted]">
            {approveCount} / {vault.requiredSigners} required
          </span>
        </CardHeader>

        {vault.approvals.length === 0 ? (
          <p className="body-sm text-[--ct-text-muted]">No signatures yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="stat-label text-left pb-2">Signer</th>
                  <th className="stat-label text-left pb-2">Decision</th>
                  <th className="stat-label text-left pb-2">Reason</th>
                  <th className="stat-label text-left pb-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {vault.approvals.map((approval) => (
                  <tr key={approval.id}>
                    <td className="py-2 pr-4 mono tabular text-xs text-[--ct-text-muted] truncate max-w-xs">
                      {approval.signerWallet}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          approval.decision === "approve"
                            ? "ct-status-success body-xs font-semibold"
                            : "ct-status-danger body-xs font-semibold"
                        }
                      >
                        {approval.decision}
                      </span>
                    </td>
                    <td className="py-2 pr-4 body-xs text-[--ct-text-muted]">
                      {approval.reason ?? "—"}
                    </td>
                    <td className="py-2 body-xs text-[--ct-text-faint] tabular mono">
                      {approval.signedAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Disclaimers */}
      <Card>
        <CardHeader>
          <CardTitle>Disclaimers</CardTitle>
        </CardHeader>
        <p className="body-sm text-[--ct-text-muted] whitespace-pre-wrap">{vault.disclaimers}</p>
      </Card>
    </section>
  );
}
