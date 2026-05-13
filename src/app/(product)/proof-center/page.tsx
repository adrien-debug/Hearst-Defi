import { ProofFilter } from "@/components/proof/proof-filter";
import { parseFilter } from "@/components/proof/proof-filter-types";
import { ProofGrid } from "@/components/proof/proof-grid";
import { getProofs } from "@/lib/mock/proof-center";

interface ProofCenterPageProps {
  searchParams: Promise<{ type?: string | string[] }>;
}

export default async function ProofCenterPage({
  searchParams,
}: ProofCenterPageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.type) ? params.type[0] : params.type;
  const filter = parseFilter(raw);
  const proofs = getProofs();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="eyebrow">Hearst Yield Vault</p>
        <h1 className="h1">Proof Center</h1>
        <p className="body-sm max-w-2xl">
          Every data point that backs the vault — mining attestations, custody
          snapshots, audits, and the methodology itself — hashed and posted with
          its source URI. Built so the LP committee has nothing to attack on
          provenance.
        </p>
      </header>

      <ProofFilter />

      <ProofGrid proofs={proofs} filter={filter} />

      <footer className="border-t border-[--color-border-subtle] pt-6">
        <p className="body-xs">
          All hashes are recoverable; URIs point to IPFS pins or signed HTTPS
          endpoints. Phase 1 publishes off-chain; Phase 2 mirrors each entry
          on Base via the EventLogger contract and surfaces the tx hash here.
        </p>
      </footer>
    </div>
  );
}
