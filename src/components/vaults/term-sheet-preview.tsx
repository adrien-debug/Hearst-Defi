// Term sheet preview for /vaults/[id] — Step 2 of 4.
// Server Component. No I/O. Composed from locked DS primitives.
// APY via <ApyRange> (#1). Provenance badges on every KPI (#2).
// Disclaimers section present (#10). No forbidden words (#5).

import { ApyRange } from "@/components/ui/apy-range";
import { Badge } from "@/components/ui/badge";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import type { VaultProduct } from "@/lib/data/vaults";

const USD_COMPACT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const USD_FULL = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const SPV_LABELS: Record<string, string> = {
  cayman: "Cayman Islands Exempted Limited Partnership",
  bvi: "British Virgin Islands LP",
  delaware: "Delaware LP",
  lux: "Luxembourg RAIF",
};

const REG_LABELS: Record<string, string> = {
  regD_506c: "Reg D, Rule 506(c) — US Accredited Investors",
  regS: "Reg S — Non-US Qualified Investors",
  art2_lux: "Art. 2 RAIF — EU Professional Investors",
};

const ALLOCATION_ROWS = (vault: VaultProduct) => [
  {
    label: "Bitcoin Mining Operations",
    bps: vault.targetMiningBps,
    description:
      "Directly deployed hashrate — revenue share from partner mining facilities. Primary yield engine.",
  },
  {
    label: "BTC Tactical Delta",
    bps: vault.targetBtcTacticalBps,
    description:
      "Spot BTC exposure for directional upside. Sized within a realised-volatility guardrail (≤ 35v).",
  },
  {
    label: "USDC Base Lending",
    bps: vault.targetUsdcBaseBps,
    description:
      "T-bills + on-chain lending (Aave/Compound weighted average). Distributable in stable periods.",
  },
  {
    label: "Stable Reserve",
    bps: vault.targetStableReserveBps,
    description:
      "USDC native yield buffer. Funds 60-day soft lock-up window and redemption queue.",
  },
];

interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

function Section({ id, title, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h3 id={id} className="ct-section-title">
        {title}
      </h3>
      {children}
    </section>
  );
}

interface KpiRowProps {
  label: string;
  value: React.ReactNode;
  provenance?: "estimated" | "attested" | "live" | "manual";
}

function KpiRow({ label, value, provenance = "manual" }: KpiRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[--ct-border-soft] last:border-0">
      <span className="stat-label flex-1">{label}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ProvenanceBadge kind={provenance} />
        <span className="stat-value tabular text-[length:var(--ct-text-sm)] text-right">
          {value}
        </span>
      </div>
    </div>
  );
}

interface TermSheetPreviewProps {
  vault: VaultProduct;
}

/**
 * Full term sheet for /vaults/[id].
 * Sections: KPIs, Strategy, Allocation policy, Legal, Disclaimers.
 */
export function TermSheetPreview({ vault }: TermSheetPreviewProps) {
  const allocRows = ALLOCATION_ROWS(vault);
  const mgmtPct = (vault.fees.mgmtBps / 100).toFixed(2);
  const perfPct = (vault.fees.perfBps / 100).toFixed(0);
  const hurdlePct = (vault.fees.hurdleBps / 100).toFixed(0);

  return (
    <div className="flex flex-col gap-8">
      {/* ── 1. KPIs ─────────────────────────────────────────────────── */}
      <Section id="sec-kpis" title="Key metrics">
        <div className="ct-card flex flex-col gap-0">
          {/* APY range — mandatory primitive (#1), provenance badge (#2) */}
          <div className="flex items-center justify-between gap-4 py-3 border-b border-[--ct-border-soft]">
            <span className="stat-label flex-1">Target APY range</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ProvenanceBadge kind="estimated" />
              <ApyRange
                low={vault.apyLow}
                high={vault.apyHigh}
                precision={1}
                className="stat-value text-[length:var(--ct-text-sm)]"
              />
            </div>
          </div>

          <KpiRow
            label="Soft lock-up period"
            value={`${vault.softLockupDays} days`}
            provenance="manual"
          />
          <KpiRow
            label="Minimum subscription"
            value={USD_FULL.format(vault.minTicketUsdc)}
            provenance="manual"
          />
          <KpiRow
            label="Management fee"
            value={`${mgmtPct}% p.a.`}
            provenance="manual"
          />
          <KpiRow
            label="Performance fee"
            value={`${perfPct}%${vault.fees.hurdleBps > 0 ? ` above ${hurdlePct}% hurdle` : " (no hurdle)"}`}
            provenance="manual"
          />
          <KpiRow
            label="Vault capacity"
            value={USD_COMPACT.format(vault.capacityUsdc)}
            provenance="manual"
          />
          <KpiRow
            label="Current AUM"
            value={USD_COMPACT.format(vault.currentAumUsdc)}
            provenance="live"
          />
          <KpiRow
            label="Distribution cadence"
            value="Monthly · Day 1, T+5"
            provenance="manual"
          />
          <KpiRow
            label="Methodology"
            value="v1.0 (active)"
            provenance="attested"
          />
        </div>
      </Section>

      {/* ── 2. Strategy ─────────────────────────────────────────────── */}
      <Section id="sec-strategy" title="Strategy & provenance">
        <div className="ct-card flex flex-col gap-3">
          <p className="body-md ct-text-body">{vault.description}</p>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[--ct-border-soft]">
            <Badge variant="brand">Mining-backed</Badge>
            <Badge variant="default">Rule-based rebalancing</Badge>
            <Badge variant="default">Monthly USDC distributions</Badge>
            <Badge variant="default">No leverage</Badge>
          </div>
          <div className="pt-2 border-t border-[--ct-border-soft]">
            <p className="body-sm ct-text-muted">
              <strong className="ct-text-body">Methodology:</strong> Yield
              projections follow{" "}
              <span className="font-mono">v1.0</span> — a weighted-bucket model
              combining mining net distributable yield, USDC base lending, BTC
              tactical P&L, and stable reserve yield. APY ranges use
              ±10–30% assumption risk factors. Published and immutable; any
              change requires a version bump and an Architecture Decision Record.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 3. Allocation policy ────────────────────────────────────── */}
      <Section id="sec-alloc" title="Allocation policy">
        <div className="ct-card flex flex-col gap-0">
          {allocRows.map((row, i) => (
            <div
              key={row.label}
              className={
                i < allocRows.length - 1
                  ? "flex flex-col gap-1 py-3 border-b border-[--ct-border-soft]"
                  : "flex flex-col gap-1 py-3"
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="body-md font-semibold ct-text-primary">
                  {row.label}
                </span>
                <span className="tabular font-mono font-semibold text-[length:var(--ct-text-sm)] ct-text-strong">
                  {(row.bps / 100).toFixed(0)}%
                </span>
              </div>
              <p className="body-sm ct-text-muted">{row.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 4. Legal ────────────────────────────────────────────────── */}
      <Section id="sec-legal" title="Legal & structure">
        <div className="ct-card flex flex-col gap-0">
          <KpiRow
            label="SPV structure"
            value={SPV_LABELS[vault.spvJurisdiction] ?? vault.spvJurisdiction}
            provenance="manual"
          />
          <KpiRow
            label="Share class"
            value={`Class ${vault.shareClass}`}
            provenance="manual"
          />
          <KpiRow
            label="Regulatory exemption"
            value={REG_LABELS[vault.regExemption] ?? vault.regExemption}
            provenance="manual"
          />
          <KpiRow
            label="Custodian"
            value="Fireblocks MPC"
            provenance="attested"
          />
          <KpiRow
            label="Multisig threshold"
            value="3 of 5 signers"
            provenance="manual"
          />
          <KpiRow
            label="Audit"
            value="Spearbit · Q1 2026"
            provenance="attested"
          />
        </div>
      </Section>

      {/* ── 5. Disclaimers (#10 — mandatory "not guaranteed") ────────── */}
      <Section id="sec-disclaimers" title="Disclaimers">
        <div
          className="ct-card border border-[--ct-border-strong]"
          role="note"
          aria-label="Important disclaimers"
        >
          <p className="body-sm ct-text-muted leading-relaxed">
            {vault.disclaimers}
          </p>
          <p className="body-xs ct-text-faint mt-3 pt-3 border-t border-[--ct-border-soft]">
            APY ranges are not a projection of returns. Past performance does
            not indicate future results. Allocations shown are targets and may
            deviate. This document is informational only and does not constitute
            an offer or solicitation where prohibited by law.
          </p>
        </div>
      </Section>
    </div>
  );
}
