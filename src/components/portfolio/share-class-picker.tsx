import "server-only";

import { prisma } from "@/lib/db";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";

/**
 * ShareClassPicker — Server Component.
 *
 * Lists all active share classes for a given vault, showing each class's
 * terms (min ticket, lock-up, management fee, performance fee).
 *
 * Fees are displayed in percent (mgmtFeeBps / 100 → 1.0%).
 * APY is never shown as a single point here — the parent page owns that.
 *
 * Design tokens: --ct-* only. No hard-coded hex. No new primitives.
 * Provenance badge: "estimated" — terms are contract-defined, not live data.
 */

interface ShareClassPickerProps {
  /** VaultDeployment.id */
  vaultId: string;
  /** Optionally highlight a specific class code ("A" or "B"). */
  selectedCode?: string;
}

interface ShareClassRow {
  id: string;
  code: string;
  minTicket: number;
  lockupDays: number;
  mgmtFeeBps: number;
  perfFeeBps: number;
  active: boolean;
}

async function loadShareClasses(vaultId: string): Promise<ShareClassRow[]> {
  try {
    const rows = await prisma.shareClass.findMany({
      where: { vaultId, active: true },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        minTicket: true,
        lockupDays: true,
        mgmtFeeBps: true,
        perfFeeBps: true,
        active: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      minTicket: r.minTicket.toNumber(),
      lockupDays: r.lockupDays,
      mgmtFeeBps: r.mgmtFeeBps,
      perfFeeBps: r.perfFeeBps,
      active: r.active,
    }));
  } catch {
    // DB unavailable — return empty; caller should show a skeleton.
    return [];
  }
}

function formatMinTicket(usdcAmount: number): string {
  if (usdcAmount >= 1_000_000) {
    return `$${(usdcAmount / 1_000_000).toFixed(1)}M`;
  }
  return `$${(usdcAmount / 1_000).toFixed(0)}k`;
}

function formatFeePct(bps: number): string {
  return `${(bps / 100).toFixed(2).replace(/\.00$/, "")}%`;
}

interface ShareClassCardProps {
  row: ShareClassRow;
  selected: boolean;
}

function ShareClassCard({ row, selected }: ShareClassCardProps) {
  return (
    <article
      aria-label={`Share Class ${row.code}`}
      data-testid={`share-class-card-${row.code}`}
      className={cn(
        "flex flex-col gap-3 rounded-[var(--ct-radius-lg)] border p-5 transition-colors",
        selected
          ? "border-[var(--ct-border-accent)] bg-[var(--ct-surface-1)]"
          : "border-[var(--ct-border-soft)] bg-[var(--ct-surface-0)] hover:border-[var(--ct-border-strong)]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-[var(--ct-radius-md)] font-bold text-sm",
              selected
                ? "bg-[var(--ct-accent)] text-[var(--ct-bg-deep)]"
                : "bg-[var(--ct-surface-2)] text-[var(--ct-text-body)]",
            )}
            aria-hidden
          >
            {row.code}
          </span>
          <h3 className="font-semibold text-[var(--ct-text-strong)]">
            Class {row.code}
          </h3>
        </div>
        <ProvenanceBadge kind="estimated" />
      </div>

      {/* Terms grid */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <dt className="body-xs text-[var(--ct-text-muted)]">Min. Ticket</dt>
          <dd
            className="body-sm font-semibold tabular text-[var(--ct-text-primary)]"
            data-testid={`min-ticket-${row.code}`}
          >
            {formatMinTicket(row.minTicket)} USDC
          </dd>
        </div>

        <div>
          <dt className="body-xs text-[var(--ct-text-muted)]">Soft Lock-Up</dt>
          <dd
            className="body-sm font-semibold tabular text-[var(--ct-text-primary)]"
            data-testid={`lockup-${row.code}`}
          >
            {row.lockupDays} days
          </dd>
        </div>

        <div>
          <dt className="body-xs text-[var(--ct-text-muted)]">Mgmt Fee</dt>
          <dd
            className="body-sm font-semibold tabular text-[var(--ct-text-primary)]"
            data-testid={`mgmt-fee-${row.code}`}
          >
            {formatFeePct(row.mgmtFeeBps)} / yr
          </dd>
        </div>

        <div>
          <dt className="body-xs text-[var(--ct-text-muted)]">Perf Fee</dt>
          <dd
            className="body-sm font-semibold tabular text-[var(--ct-text-primary)]"
            data-testid={`perf-fee-${row.code}`}
          >
            {formatFeePct(row.perfFeeBps)}
          </dd>
        </div>
      </dl>

      {/* Disclaimer — mandatory non-negotiable #10 */}
      <p className="body-xs text-[var(--ct-text-faint)] border-t border-[var(--ct-border-soft)] pt-2">
        Terms are subject to the SPV subscription agreement. Not a projection or
        an offer where prohibited.
      </p>
    </article>
  );
}

export async function ShareClassPicker({
  vaultId,
  selectedCode,
}: ShareClassPickerProps) {
  const classes = await loadShareClasses(vaultId);

  if (classes.length === 0) {
    return (
      <Card>
        <p className="body-sm text-[var(--ct-text-muted)]">
          No active share classes available for this vault.
        </p>
      </Card>
    );
  }

  return (
    <section
      aria-label="Share classes"
      data-testid="share-class-picker"
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-2">
        <h2 className="eyebrow text-[var(--ct-text-muted)]">Share Classes</h2>
        <ProvenanceBadge kind="estimated" />
      </div>

      <div
        className={cn(
          "grid gap-4",
          classes.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
        )}
      >
        {classes.map((cls) => (
          <ShareClassCard
            key={cls.id}
            row={cls}
            selected={cls.code === selectedCode}
          />
        ))}
      </div>
    </section>
  );
}
