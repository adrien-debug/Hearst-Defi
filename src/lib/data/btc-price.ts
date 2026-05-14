import "server-only";

export interface BtcPriceData {
  usd: number;
  usd_24h_change: number;
  fetched_at: Date;
  stale: boolean; // true if age > 5 minutes
}

interface CoinGeckoResponse {
  bitcoin: {
    usd: number;
    usd_24h_change: number;
  };
}

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchBtcPrice(): Promise<BtcPriceData> {
  const fetched_at = new Date();

  try {
    const res = await fetch(COINGECKO_URL, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return { usd: 0, usd_24h_change: 0, fetched_at, stale: true };
    }

    const data = (await res.json()) as CoinGeckoResponse;

    const usd = data?.bitcoin?.usd ?? 0;
    const usd_24h_change = data?.bitcoin?.usd_24h_change ?? 0;

    if (usd === 0) {
      return { usd: 0, usd_24h_change: 0, fetched_at, stale: true };
    }

    const ageMs = Date.now() - fetched_at.getTime();
    const stale = ageMs > STALE_THRESHOLD_MS;

    return { usd, usd_24h_change, fetched_at, stale };
  } catch {
    // Silent fallback — never crash the dashboard
    return { usd: 0, usd_24h_change: 0, fetched_at, stale: true };
  }
}
