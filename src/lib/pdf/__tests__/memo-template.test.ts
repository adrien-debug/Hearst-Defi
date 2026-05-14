import { describe, expect, it } from "vitest";

import { getMockMemoInput } from "@/lib/mock/investor-memo";
import { periodFromIso } from "@/lib/pdf/memo-data";

describe("MemoDocument PDF rendering", () => {
  it("renders the 8-page investor memo to a non-trivial PDF buffer", async () => {
    // Dynamic imports keep react-pdf out of the module graph for the other
    // tests in this repo and make sure the smoke test only runs when this
    // file is collected.
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { MemoDocument } = await import("@/lib/pdf/memo-template");

    const input = getMockMemoInput();
    const generatedAt = "2026-01-15T00:00:00.000Z";
    const period = periodFromIso(generatedAt);

    const buf = await renderToBuffer(
      MemoDocument({
        data: { input, memo: null, generatedAt, period },
      }),
    );

    // Sanity: it's a real PDF (starts with %PDF-) and is at least 10kB.
    expect(buf.length).toBeGreaterThan(10_000);
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    // Visible smoke for the operator running the suite — confirms ~size band.
    // eslint-disable-next-line no-console
    console.log(`[memo-pdf-smoke] generated ${buf.length} bytes`);
  }, 30_000);
});
