// /vaults/[id]/invest — Step 3 of 4: Deposit
// Server Component. Reads vault from demo loader. Guards non-live vaults.
// Non-negotiable #1: APY range displayed via <ApyRange> inside InvestForm.
// Non-negotiable #3: PTAI projection mandatory — delegated to InvestForm.
// Non-negotiable #5: no forbidden words in any copy.
// Non-negotiable #10: disclaimer present in InvestForm and DepositSummary.

import { notFound } from "next/navigation";
import { getVault } from "@/lib/demo/loaders";
import { StepProgress } from "@/components/vaults/step-progress";
import { InvestForm } from "@/components/vaults/invest-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deposit — Hearst Yield Vault",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvestPage({ params }: PageProps) {
  const { id } = await params;
  const vault = await getVault(id);

  if (!vault) notFound();
  // Only live vaults accept deposits
  if (vault.status !== "live") notFound();

  return (
    <div className="ct-section space-y-6 px-6 py-8 max-w-5xl mx-auto w-full">
      {/* Eyebrow + step indicator */}
      <header className="flex flex-col gap-3">
        <span className="eyebrow">Deposit</span>
        <h1 className="h1">{vault.name}</h1>
        <StepProgress active="deposit" />
      </header>

      {/* Deposit form (Client Component) */}
      <InvestForm vault={vault} />

      {/* Footer disclaimer — mandatory #10 */}
      <footer>
        <p className="body-xs ct-text-faint max-w-3xl">
          {vault.disclaimers} APY ranges are target projections based on
          stated assumptions — they are not a projection of future returns
          and are subject to change without notice. Subject to minimum
          subscription of ${(vault.minTicketUsdc / 1_000).toFixed(0)}k,
          {vault.softLockupDays}-day soft lock-up, and jurisdictional
          restrictions. Methodology v1.0.
        </p>
      </footer>
    </div>
  );
}
