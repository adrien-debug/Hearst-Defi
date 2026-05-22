"use server";

import type { InvestorMemoOutput } from "@/lib/agents/schemas";
import { loadMemoInput } from "@/lib/agents/loaders/vault";
import { loadMemoPdfExtras, periodFromIso } from "@/lib/pdf/memo-data";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertRateLimit } from "@/lib/rate-limit";

/**
 * Generates the 8-page Investor Memo PDF on the server.
 *
 * - react-pdf is dynamically imported so its node-only dependencies never get
 *   pulled into a client bundle.
 * - Input data is sourced from the live vault loader so the engine numbers
 *   shown in the PDF stay in lock-step with the on-screen memo.
 * - The PDF prose (executive summary bullets, disclaimer, methodology note)
 *   is taken from the optional `memo` argument when present. When absent
 *   the PDF falls back to canned copy so it still renders during dev.
 *
 * Returns a `Uint8Array` so the client can wrap it in a `Blob` for download
 * without serializing a `Buffer` over the server-action boundary.
 */
export async function generateMemoPdfAction(
  memo: InvestorMemoOutput | null,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const { userId } = await requireAuth();
  await assertRateLimit(`generate-pdf:${userId}`, 3, 60_000);
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { MemoDocument } = await import("@/lib/pdf/memo-template");

  const input = await loadMemoInput();
  const generatedAt = new Date().toISOString();
  const period = periodFromIso(generatedAt);

  // PDF-only extras (mining ops, latest distribution, monthly history) are
  // sourced from Prisma. These loaders return canned fallbacks when the DB is
  // empty, but loadMemoInput() above requires a seeded database and throws
  // when vault data (VaultSnapshot, Allocation) is missing.
  const { miningOps, distribution, monthlyHistory } = await loadMemoPdfExtras();

  const buffer = await renderToBuffer(
    <MemoDocument
      data={{
        input,
        memo,
        generatedAt,
        period,
        miningOps,
        distribution,
        monthlyHistory,
      }}
    />,
  );

  const bytes = new Uint8Array(buffer);
  const stamp = generatedAt.slice(0, 7); // YYYY-MM
  const filename = `hearst-yield-vault-memo_${stamp}.pdf`;
  return { bytes, filename };
}
