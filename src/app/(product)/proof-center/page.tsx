import { ChainStatusBadge } from "@/components/proof/chain-status-badge";
import { ProofFilter } from "@/components/proof/proof-filter";
import { parseFilter } from "@/components/proof/proof-filter-types";
import { ProofGrid } from "@/components/proof/proof-grid";
import type { UnifiedProof } from "@/components/proof/proof-types";
import { isChainConfigured } from "@/lib/chain/client";
import { fetchOnChainEvents } from "@/lib/chain/event-logger";
import { fetchOnChainAttestations } from "@/lib/chain/por-registry";
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

  const chainConfigured = isChainConfigured();
  const [onChainEvents, onChainAttestations] = await Promise.all([
    fetchOnChainEvents({ limit: 50 }),
    fetchOnChainAttestations({ limit: 12 }),
  ]);
  const paper = getProofs();

  const proofs: UnifiedProof[] = [
    ...onChainAttestations.map(
      (data): UnifiedProof => ({
        source: "on-chain",
        kind: "attestation",
        data,
      }),
    ),
    ...onChainEvents.map(
      (data): UnifiedProof => ({
        source: "on-chain",
        kind: "event",
        data,
      }),
    ),
    ...paper.map((p): UnifiedProof => ({ ...p, source: "paper" })),
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="eyebrow">Hearst Yield Vault</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="h1">Proof Center</h1>
          <ChainStatusBadge
            configured={chainConfigured}
            eventCount={onChainEvents.length}
            attestationCount={onChainAttestations.length}
          />
        </div>
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
          On-chain entries are read directly from Base Sepolia via the
          EventLogger and PoRRegistry contracts. Off-chain entries are pinned to
          IPFS or signed HTTPS endpoints; Phase 2 mirrors each new entry
          on-chain and surfaces the tx hash here.
        </p>
      </footer>
    </div>
  );
}
