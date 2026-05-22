// /vaults — Step 1 of 4: Select a product
// Server Component. Single ProductSelectCard at MVP (forward-compatible grid).
// Non-negotiable #9: single vault MVP, no multi-vault abstractions today.

import { listVaults } from "@/lib/demo/loaders";
import { ProductSelectCard } from "@/components/vaults/product-select-card";
import { StepProgress } from "@/components/vaults/step-progress";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Select a Product — Hearst Yield Vault",
};

export default async function VaultsPage() {
  const vaults = await listVaults();

  return (
    <>
      {/* Page header */}
      <header className="flex flex-col gap-4">
        <span className="eyebrow">Invest</span>
        <h1 className="h1">Select a product</h1>
        <p className="body-lg ct-text-muted max-w-xl">
          Professional-grade structured yield for qualified investors.
          Review the term sheet and confirm before depositing.
        </p>

        {/* Step wizard */}
        <div className="pt-2">
          <StepProgress active="select" />
        </div>
      </header>

      {/* Product grid — auto-fit, single card at MVP */}
      <section aria-labelledby="vaults-heading">
        <h2 id="vaults-heading" className="ct-section-title mb-4">
          Available products
        </h2>

        {vaults.length === 0 ? (
          <Card className="p-6">
            <p className="body-md">Aucun produit disponible pour le moment.</p>
            <p className="body-sm ct-text-muted mt-1">
              Revenez bientôt ou contactez votre gestionnaire.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(var(--ct-vault-card-min-w),1fr))]">
            {vaults.map((vault) => (
              <ProductSelectCard key={vault.id} vault={vault} />
            ))}
          </div>
        )}
      </section>

      {/* Global disclaimer (#10) */}
      <footer>
        <p className="body-xs ct-text-faint max-w-2xl">
          Products listed are offered exclusively to professional and qualified
          investors. Past performance does not indicate future results. APY
          ranges are not a projection of returns. Subject to minimum
          subscription, jurisdictional restrictions, and soft lock-up terms.
        </p>
      </footer>
    </>
  );
}
