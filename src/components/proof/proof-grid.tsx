import { ProofCard } from "@/components/proof/proof-card";
import type { FilterValue } from "@/components/proof/proof-filter-types";
import type { ProofItem } from "@/lib/mock/proof-center";

interface ProofGridProps {
  proofs: ReadonlyArray<ProofItem>;
  filter: FilterValue;
}

export function ProofGrid({ proofs, filter }: ProofGridProps) {
  const filtered =
    filter === "all"
      ? proofs
      : proofs.filter((p) => p.proofType === filter);

  if (filtered.length === 0) {
    return (
      <div className="rounded-[--radius-card] border border-dashed border-[--color-border-subtle] py-12 text-center">
        <p className="body-sm">No proofs found for this filter.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filtered.map((proof) => (
        <li key={proof.id} className="contents">
          <ProofCard proof={proof} />
        </li>
      ))}
    </ul>
  );
}
