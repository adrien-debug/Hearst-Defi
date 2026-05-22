"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// ----------------------------------------------------------------------------
// Schema
// ----------------------------------------------------------------------------

const PROOF_TYPES = [
  "mining_attestation",
  "custody",
  "audit",
  "methodology",
] as const;

/**
 * Proof.hash is stored as a bytes32 hex string (64 hex chars, 0x-prefixed = 66 chars).
 * We also accept IPFS CIDv0 (Qm…, 46 chars) and CIDv1 (baf…, 52-59 chars) as hash values
 * because some attestations store the CID directly rather than a keccak digest.
 */
const HashSchema = z
  .string()
  .refine(
    (v) =>
      /^0x[a-fA-F0-9]{64}$/.test(v) || // bytes32 hex
      /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(v) || // CIDv0
      /^baf[a-zA-Z0-9]{49,56}$/.test(v), // CIDv1
    {
      message:
        "hash must be a bytes32 hex (0x + 64 hex chars), CIDv0 (Qm…), or CIDv1 (baf…)",
    },
  );

const ProofIngestSchema = z.object({
  proofType: z.enum(PROOF_TYPES),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "period must be YYYY-MM")
    .optional(),
  hash: HashSchema,
  uri: z
    .string()
    .min(1, "uri is required")
    .max(2048)
    .refine(
      (v) => v.startsWith("ipfs://") || v.startsWith("https://"),
      { message: "uri must start with ipfs:// or https://" },
    ),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "txHash must be 0x + 64 hex chars")
    .optional(),
  notes: z.string().max(500).optional(),
});

export type ProofIngestInput = z.infer<typeof ProofIngestSchema>;

export type ProofIngestResult =
  | { ok: true; id: string }
  | { ok: false; issues: z.ZodIssue[] };

// ----------------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------------

/**
 * Admin-gated Server Action: validate and persist a new Proof row.
 *
 * - Validates the payload with Zod (strict).
 * - Calls requireAdmin() — throws if the requester is not an admin.
 * - Persists via Prisma and revalidates /admin/proofs + /admin/proof-center.
 */
export async function ingestProof(
  input: ProofIngestInput,
): Promise<ProofIngestResult> {
  const admin = await requireAdmin();

  const parsed = ProofIngestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues };
  }

  const { proofType, period, hash, uri, txHash, notes } = parsed.data;

  try {
    const proof = await prisma.proof.create({
      data: {
        proofType,
        period: period ?? null,
        hash,
        uri,
        txHash: txHash ?? null,
        notes: notes ?? null,
        // postedBy uses the admin's walletAddress when available, else userId
        postedBy: admin.walletAddress ?? admin.userId,
        // postedAt is defaulted to now() in the Prisma schema
      },
    });

    revalidatePath("/admin/proofs");
    revalidatePath("/admin/proof-center");

    logger.info("proof ingested", { proofId: proof.id, proofType });

    return { ok: true, id: proof.id };
  } catch (err) {
    logger.error("ingestProof failed", { proofType }, err);
    throw err;
  }
}

/**
 * Admin-gated Server Action: hard-delete a Proof row by id.
 */
export async function deleteProof(id: string): Promise<{ ok: true }> {
  await requireAdmin();

  try {
    await prisma.proof.delete({ where: { id } });
    revalidatePath("/admin/proofs");
    revalidatePath("/admin/proof-center");
    logger.info("proof deleted", { proofId: id });
    return { ok: true };
  } catch (err) {
    // Race: another admin already deleted this proof. Surface a clean message
    // instead of leaking Prisma's verbose error text.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      logger.warn("deleteProof: already deleted", { proofId: id });
      throw new Error("Proof already deleted");
    }
    logger.error("deleteProof failed", { proofId: id }, err);
    throw err;
  }
}
