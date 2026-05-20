import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetDefiLlamaCacheForTests,
  fetchDefiLlama,
} from "@/lib/data/defillama";

/**
 * The DeFiLlama loader hits a single public endpoint. We stub `fetch`
 * globally and reset both the in-memory cache and the global mock
 * between cases so each test starts from a clean slate.
 *
 * NOTE: we never import from `Dev/hearst-connect` — these tests are
 * recoded from scratch against `defillama.ts` in this repo.
 */

interface PoolRaw {
  pool: string;
  project: string;
  chain: string;
  symbol: string;
  apy: number | null;
  tvlUsd: number | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function poolsPayload(pools: PoolRaw[]): { status: string; data: PoolRaw[] } {
  return { status: "success", data: pools };
}

beforeEach(() => {
  __resetDefiLlamaCacheForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchDefiLlama", () => {
  it("Cas A — fetch OK: maps pools, filters by TVL/chain/symbol, returns live", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        poolsPayload([
          // Eligible
          {
            pool: "p1",
            project: "aave-v3",
            chain: "Ethereum",
            symbol: "USDC",
            apy: 5.4,
            tvlUsd: 1_200_000_000,
          },
          {
            pool: "p2",
            project: "compound-v3",
            chain: "Base",
            symbol: "USDC",
            apy: 6.8,
            tvlUsd: 400_000_000,
          },
          {
            pool: "p3",
            project: "morpho",
            chain: "Arbitrum",
            symbol: "USDC",
            apy: 9.1,
            tvlUsd: 80_000_000,
          },
          // Rejected: TVL too low
          {
            pool: "p4",
            project: "small-pool",
            chain: "Ethereum",
            symbol: "USDC",
            apy: 25.0,
            tvlUsd: 1_000_000,
          },
          // Rejected: not USDC
          {
            pool: "p5",
            project: "aave-v3",
            chain: "Ethereum",
            symbol: "USDT",
            apy: 4.0,
            tvlUsd: 500_000_000,
          },
          // Rejected: unsupported chain
          {
            pool: "p6",
            project: "aave-v3",
            chain: "Polygon",
            symbol: "USDC",
            apy: 7.0,
            tvlUsd: 500_000_000,
          },
        ]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const snap = await fetchDefiLlama();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snap.source).toBe("live");
    expect(snap.stale).toBe(false);
    expect(snap.topYields).toHaveLength(3);
    // Sorted by APY descending.
    expect(snap.topYields[0]?.project).toBe("morpho");
    expect(snap.topYields[1]?.project).toBe("compound-v3");
    expect(snap.topYields[2]?.project).toBe("aave-v3");
    expect(snap.apyTopPct).toBe(9.1);
    // Median of [9.1, 6.8, 5.4] = 6.8
    expect(snap.apyMedianPct).toBe(6.8);
  });

  it("Cas B — fetch timeout: returns fallback with source='fallback' and stale=true", async () => {
    // Simulate timeout by rejecting with AbortError-like.
    const fetchMock = vi.fn(async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });
    vi.stubGlobal("fetch", fetchMock);

    const snap = await fetchDefiLlama();

    expect(snap.source).toBe("fallback");
    expect(snap.stale).toBe(true);
    expect(snap.topYields.length).toBeGreaterThan(0);
    expect(snap.apyMedianPct).toBeGreaterThan(0);
  });

  it("Cas C — invalid response shape: returns fallback", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ status: "success", data: "not-an-array" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const snap = await fetchDefiLlama();

    expect(snap.source).toBe("fallback");
    expect(snap.stale).toBe(true);
  });

  it("Cas D — cache hit: second call within TTL does not refetch", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        poolsPayload([
          {
            pool: "p1",
            project: "aave-v3",
            chain: "Ethereum",
            symbol: "USDC",
            apy: 5.4,
            tvlUsd: 1_200_000_000,
          },
        ]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchDefiLlama();
    const second = await fetchDefiLlama();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first); // same cached reference
    expect(second.source).toBe("live");
  });
});
