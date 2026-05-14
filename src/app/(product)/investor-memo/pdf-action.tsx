"use server";

import type { InvestorMemoOutput } from "@/lib/agents/schemas";
import { getMockMemoInput } from "@/lib/mock/investor-memo";
import { periodFromIso } from "@/lib/pdf/memo-data";

/**
 * Generates the 8-page Investor Memo PDF on the server.
 *
 * - react-pdf is dynamically imported so its node-only dependencies never get
 *   pulled into a client bundle.
 * - Input data is sourced from the same mock loader the Markdown agent uses,
 *   so the engine numbers shown in the PDF stay in lock-step with the
 *   on-screen memo. Once the Phase 1 loader ships, swap `getMockMemoInput()`
 *   for the Prisma-backed loader in a single place.
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
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { MemoDocument } = await import("@/lib/pdf/memo-template");

  const input = getMockMemoInput();
  const generatedAt = new Date().toISOString();
  const period = periodFromIso(generatedAt);

  const buffer = await renderToBuffer(
    <MemoDocument
      data={{
        input,
        memo,
        generatedAt,
        period,
      }}
    />,
  );

  const bytes = new Uint8Array(buffer);
  const stamp = generatedAt.slice(0, 7); // YYYY-MM
  const filename = `hearst-yield-vault-memo_${stamp}.pdf`;
  return { bytes, filename };
}
