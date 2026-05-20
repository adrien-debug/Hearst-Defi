import { requireAdmin } from "@/lib/auth/require-admin";
import { VaultWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function NewVaultPage() {
  await requireAdmin();

  return (
    <section className="ct-section space-y-8">
      <header className="space-y-1">
        <p className="eyebrow">Admin / Vaults</p>
        <h1 className="h1">New Vault Deployment</h1>
        <p className="body-md text-[--ct-text-muted] max-w-xl">
          5-step wizard. Nothing is persisted until you click{" "}
          <span className="text-[--ct-text-primary]">Create Draft</span> on the last step.
        </p>
      </header>

      <VaultWizard />
    </section>
  );
}
