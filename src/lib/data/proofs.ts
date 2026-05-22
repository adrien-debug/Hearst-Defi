import "server-only";

import { verifyStoredAttestation } from "@/lib/attestation";
import { prisma } from "@/lib/db";
import type { ProofItem, ProofType } from "@/lib/mock/proof-center";

const PROOF_TYPES: ReadonlySet<string> = new Set<ProofType>([
  "mining_attestation",
  "custody",
  "audit",
  "methodology",
]);

const TYPE_LABEL: Record<ProofType, string> = {
  mining_attestation: "Mining attestation",
  custody: "Custody proof-of-reserves snapshot",
  audit: "Audit report",
  methodology: "Methodology document",
};

function isProofType(value: string): value is ProofType {
  return PROOF_TYPES.has(value);
}

/**
 * The Prisma `Proof` table has no `title` column; the Proof Center card needs
 * one. Derive a stable, human-readable title from the structured fields so the
 * grid renders consistently without a schema change.
 */
function deriveTitle(proofType: ProofType, period: string | null): string {
  const base = TYPE_LABEL[proofType];
  return period ? `${base} · ${period}` : base;
}

/**
 * Reads off-chain ("paper") proofs from the Prisma `Proof` table, newest first,
 * and maps them onto the `ProofItem` shape the Proof Center grid expects.
 *
 * Rows with an unknown `proofType` are skipped rather than rendered with a
 * broken filter taxonomy.
 */
export async function getProofs(): Promise<ProofItem[]> {
  const rows = await prisma.proof.findMany({
    orderBy: { postedAt: "desc" },
  });

  const items = await Promise.all(
    rows.map(async (row): Promise<ProofItem | null> => {
      if (!isProofType(row.proofType)) return null;

      const verification = await verifyStoredAttestation({
        payloadJson: row.payloadJson,
        digest: row.hash,
        signature: row.signature,
        signer: row.signer,
      });

      return {
        id: row.id,
        proofType: row.proofType,
        period: row.period,
        title: deriveTitle(row.proofType, row.period),
        hash: row.hash,
        uri: row.uri,
        postedAt: row.postedAt.toISOString(),
        postedBy: row.postedBy,
        txHash: row.txHash,
        signer: row.signer,
        attestationVerified: verification === null ? null : verification.valid,
      };
    }),
  );

  return items.filter((item): item is ProofItem => item !== null);
}
