import { notFound, redirect } from "next/navigation";

import { VaultForm, type FormState } from "@/app/admin/vaults/_vault-form";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit Vault Draft — Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVaultPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const vault = await prisma.vaultDeployment.findUnique({ where: { id } });

  if (!vault) notFound();

  if (vault.status !== "draft") {
    redirect(`/admin/vaults/${id}`);
  }

  // Map DB row → FormState for pre-population
  const signersWhitelist = JSON.parse(vault.signersWhitelist) as string[];

  const initial: FormState = {
    ticker: vault.ticker,
    name: vault.name,
    description: vault.description ?? "",
    strategy: vault.strategy as FormState["strategy"],
    colorTag: vault.colorTag ?? "accent",
    minTicketUsdc: Number(vault.minTicketUsdc),
    capacityUsdc: Number(vault.capacityUsdc),
    mgmtFeeBps: vault.mgmtFeeBps,
    perfFeeBps: vault.perfFeeBps,
    softLockupDays: vault.softLockupDays,
    targetApyLowBps: vault.targetApyLowBps,
    targetApyHighBps: vault.targetApyHighBps,
    spvJurisdiction: vault.spvJurisdiction as FormState["spvJurisdiction"],
    shareClass: vault.shareClass,
    regExemption: vault.regExemption as FormState["regExemption"],
    disclaimers: vault.disclaimers,
    targetMiningBps: vault.targetMiningBps,
    targetBtcTacticalBps: vault.targetBtcTacticalBps,
    targetUsdcBaseBps: vault.targetUsdcBaseBps,
    targetStableReserveBps: vault.targetStableReserveBps,
    signersWhitelist: signersWhitelist.length >= 2 ? signersWhitelist : [...signersWhitelist, ""],
  };

  return (
    <section className="ct-section space-y-8">
      <header className="space-y-1">
        <p className="eyebrow">Admin / Vaults / {vault.ticker}</p>
        <h1 className="h1">Edit Vault Draft</h1>
        <p className="body-md text-[--ct-text-muted] max-w-xl">
          Update the draft for{" "}
          <span className="text-[--ct-text-primary]">{vault.name}</span>. Changes are saved when
          you click <span className="text-[--ct-text-primary]">Save Changes</span> on the last
          step.
        </p>
      </header>

      <VaultForm mode="edit" vaultId={id} initial={initial} />
    </section>
  );
}
