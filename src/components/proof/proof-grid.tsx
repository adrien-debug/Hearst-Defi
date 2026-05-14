import { ProofCard } from "@/components/proof/proof-card";
import type { FilterValue } from "@/components/proof/proof-filter-types";
import {
  onChainAttestationKey,
  onChainEventKey,
  paperProofKey,
  unifiedProofType,
  type UnifiedProof,
} from "@/components/proof/proof-types";

interface ProofGridProps {
  proofs: ReadonlyArray<UnifiedProof>;
  filter: FilterValue;
}

function keyOf(proof: UnifiedProof): string {
  if (proof.source === "paper") return paperProofKey(proof);
  if (proof.kind === "event") return onChainEventKey(proof.data);
  return onChainAttestationKey(proof.data);
}

export function ProofGrid({ proofs, filter }: ProofGridProps) {
  const filtered =
    filter === "all"
      ? proofs
      : proofs.filter((p) => unifiedProofType(p) === filter);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <svg
          className="h-10 w-10 text-[--color-text-dim]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7h18M3 12h18M3 17h12"
          />
        </svg>
        <p className="body-sm">No proofs found for this filter.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filtered.map((proof) => (
        <li key={keyOf(proof)} className="contents">
          <ProofCard proof={proof} />
        </li>
      ))}
    </ul>
  );
}
