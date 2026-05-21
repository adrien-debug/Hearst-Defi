import Link from "next/link";

import { ApyRange } from "@/components/ui/apy-range";
import type { VaultProduct } from "@/lib/data/vaults";

const RISK_LABELS: Record<VaultProduct["riskLevel"], string> = {
  low: "Conservative",
  "low-moderate": "Moderate",
  moderate: "Moderate",
  high: "Aggressive",
};

interface AvailableVaultsProps {
  vaults: VaultProduct[];
}

/**
 * Available Vaults — portfolio navigation rail (right column).
 *
 * Each card links into the subscribe flow (`/vaults/[id]`). This is the primary
 * navigation surface on the portfolio per product direction. APY always shown as
 * a range via `ApyRange` (non-negotiable #1). Uses locked `dash-cell` / `--ct-*`
 * tokens only — no new primitives. Layout classes live in portfolio.css.
 */
export function AvailableVaults({ vaults }: AvailableVaultsProps) {
  return (
    <article className="dash-cell" aria-label="Available vaults">
      <div className="dash-label">
        <span>Available Vaults ({vaults.length})</span>
        <Link href="/vaults" className="pf-vault-viewall">
          View all
        </Link>
      </div>

      <div className="pf-vault-list">
        {vaults.map((vault) => (
          <Link
            key={vault.id}
            href={`/vaults/${vault.id}`}
            className="pf-vault-card"
            aria-label={`${vault.name} — open product`}
          >
            <span className="pf-vault-accent" aria-hidden="true" />
            <div className="pf-vault-body">
              <span className="pf-vault-name">{vault.name}</span>
              <span className="pf-vault-meta">
                <span className="pf-vault-dot" aria-hidden="true" />
                {RISK_LABELS[vault.riskLevel]}
                <span className="pf-vault-sep" aria-hidden="true">·</span>
                {vault.softLockupDays}-day lock-up
              </span>
            </div>
            <div className="pf-vault-apy">
              <ApyRange low={vault.apyLow} high={vault.apyHigh} precision={1} />
              <span className="pf-vault-apy-lbl">Target APY</span>
            </div>
          </Link>
        ))}
      </div>
    </article>
  );
}
