import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetFearGreedCacheForTests,
  fetchFearGreed,
} from "@/lib/data/fear-greed";

/**
 * Loader for the Crypto Fear & Greed Index (alternative.me).
 * We stub `fetch` globally and reset the in-memory cache between cases.
 *
 * NOTE: tests are recoded from scratch — no import from `Dev/hearst-connect`.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fngPayload(value: string, classification: string) {
  return {
    name: "Fear and Greed Index",
    data: [
      {
        value,
        value_classification: classification,
        timestamp: "1700000000",
        time_until_update: "1234",
      },
    ],
    metadata: { error: null },
  };
}

beforeEach(() => {
  __resetFearGreedCacheForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchFearGreed", () => {
  it("Cas A — fetch OK: parses value and maps classification", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(fngPayload("72", "Greed")),
    );
    vi.stubGlobal("fetch", fetchMock);

    const snap = await fetchFearGreed();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snap.source).toBe("live");
    expect(snap.stale).toBe(false);
    expect(snap.value).toBe(72);
    expect(snap.classification).toBe("greed");
  });

  it("Cas B — fetch timeout: returns fallback (value=50, neutral, stale)", async () => {
    const fetchMock = vi.fn(async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });
    vi.stubGlobal("fetch", fetchMock);

    const snap = await fetchFearGreed();

    expect(snap.source).toBe("fallback");
    expect(snap.stale).toBe(true);
    expect(snap.value).toBe(50);
    expect(snap.classification).toBe("neutral");
  });

  it("Cas C — invalid response shape: returns fallback", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ name: "x", data: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const snap = await fetchFearGreed();

    expect(snap.source).toBe("fallback");
    expect(snap.stale).toBe(true);
  });

  it("Cas D — cache hit: second call within TTL does not refetch", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(fngPayload("33", "Fear")),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchFearGreed();
    const second = await fetchFearGreed();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(second.classification).toBe("fear");
  });

  it("maps all five classification buckets correctly", async () => {
    const cases: Array<{ raw: string; expected: string; value: string }> = [
      { raw: "Extreme Fear", expected: "extreme-fear", value: "10" },
      { raw: "Fear", expected: "fear", value: "30" },
      { raw: "Neutral", expected: "neutral", value: "50" },
      { raw: "Greed", expected: "greed", value: "70" },
      { raw: "Extreme Greed", expected: "extreme-greed", value: "90" },
    ];

    for (const c of cases) {
      __resetFearGreedCacheForTests();
      vi.unstubAllGlobals();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => jsonResponse(fngPayload(c.value, c.raw))),
      );
      const snap = await fetchFearGreed();
      expect(snap.classification).toBe(c.expected);
      expect(snap.value).toBe(Number.parseInt(c.value, 10));
    }
  });
});
