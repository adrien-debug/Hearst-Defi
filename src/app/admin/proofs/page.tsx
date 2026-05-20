import { prisma } from "@/lib/db";
import { ProofList } from "@/components/admin/proof-list";

export const dynamic = "force-dynamic";

export default async function ProofsPage() {
  const items = await prisma.proof.findMany({
    orderBy: { postedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="eyebrow">Admin</p>
        <h1 className="h1">Proofs registry</h1>
        <p className="body-sm max-w-2xl">
          On-chain attestations published to the proof center. Hard-delete is
          irreversible — the attestation will be removed from the registry.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="stat-label">Attestations ({items.length})</h2>
        <ProofList items={items} />
      </section>

      <p className="body-sm text-[--ct-text-muted]">
        Ingestion via Server Action{" "}
        <code className="font-mono text-[--ct-text-body]">ingestProof()</code>{" "}
        — pas encore d&apos;UI. Voir{" "}
        <code className="font-mono text-[--ct-text-body]">
          docs/spec/05-proof.mdx
        </code>
        .
      </p>
    </div>
  );
}
