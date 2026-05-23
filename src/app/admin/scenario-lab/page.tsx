import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VaultSelector } from "@/components/admin/vault-selector";
import { LabShell } from "@/components/scenario/lab-shell";
import { VAULTS, VAULT_YIELD } from "@/lib/engine/vaults";
import type { VaultId } from "@/lib/engine/types";

interface ScenarioLabPageProps {
  searchParams: Promise<{ vault?: string }>;
}

function resolveVaultId(raw: string | undefined): VaultId {
  if (raw === "yield" || raw === "defensive" || raw === "btc-plus") return raw;
  return VAULT_YIELD.id;
}

export default async function ScenarioLabPage({
  searchParams,
}: ScenarioLabPageProps) {
  const params = await searchParams;
  const vaultId = resolveVaultId(params.vault);
  const vault = VAULTS[vaultId];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Scenario Lab"
        actions={
          <VaultSelector
            active={vaultId}
            basePath="/admin/scenario-lab"
            ariaLabel="Scenario Lab vault selector"
          />
        }
      />
      <p className="body-sm max-w-2xl">
        Rule-based projections for{" "}
        <span className="ct-text-strong">{vault.label}</span> across 5 market
        scenarios. Adjust inputs or select a preset — outputs are deterministic,
        conditional on stated assumptions. Not guaranteed.
      </p>

      <LabShell vaultId={vaultId} />
    </div>
  );
}
