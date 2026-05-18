export const dynamic = "force-dynamic";

import { ChainStatusBadge } from "@/components/proof/chain-status-badge";
import { ProofFilter } from "@/components/proof/proof-filter";
import { parseFilter } from "@/components/proof/proof-filter-types";
import { ProofGrid } from "@/components/proof/proof-grid";
import type { UnifiedProof } from "@/components/proof/proof-types";
import { ContractsAuditTrail } from "@/components/proof-center/contracts-audit-trail";
import { EventTimeline } from "@/components/proof-center/event-timeline";
import { PorSummary } from "@/components/proof-center/por-summary";
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
    fetchOnChainEvents({ limit: 20 }),
    fetchOnChainAttestations({ limit: 12 }),
  ]);
  const paper = getProofs();

  // Latest PoR attestation for the summary panel (most recent = index 0,
  // because fetchOnChainAttestations returns descending order).
  const latestAttestation = onChainAttestations[0] ?? null;

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
    <div className="space-y-12">
      {/* ── Header ─────────────────────────────────────────── */}
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

      {/* ── Proof of Reserves summary ───────────────────────── */}
      <section aria-labelledby="por-heading">
        <h2 id="por-heading" className="sr-only">
          Proof of Reserves
        </h2>
        <PorSummary attestation={latestAttestation} />
      </section>

      {/* ── On-chain event timeline ─────────────────────────── */}
      <section aria-labelledby="event-timeline-heading">
        <h2 id="event-timeline-heading" className="sr-only">
          On-chain event log
        </h2>
        <EventTimeline events={onChainEvents} />
      </section>

      {/* ── Full proof grid (filtered) ──────────────────────── */}
      <section aria-labelledby="proof-grid-heading">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 id="proof-grid-heading" className="h2">
            All proofs
          </h2>
          <ProofFilter />
        </div>
        <ProofGrid proofs={proofs} filter={filter} />
      </section>

      {/* ── Deployed contracts + audit trail ───────────────── */}
      <section aria-labelledby="contracts-heading">
        <h2 id="contracts-heading" className="h2 mb-6">
          Contracts &amp; audit trail
        </h2>
        <ContractsAuditTrail />
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-[--color-border-subtle] pt-6">
        <p className="body-xs">
          On-chain entries are read directly from Base Sepolia via the
          EventLogger (<span className="mono">0xb07E…3D9E</span>) and
          PoRRegistry (<span className="mono">0x2B72…28D</span>) contracts.
          Off-chain entries are pinned to IPFS or signed HTTPS endpoints; Phase
          2 mirrors each new entry on-chain and surfaces the tx hash here.
          On-chain data and vault state are fetched fresh on every request.
        </p>
      </footer>
    </div>
  );
}
