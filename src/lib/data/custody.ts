import "server-only";

import { readFileSync } from "node:fs";

import { env } from "@/lib/env";
import {
  aggregateCustody,
  type CustodyAccountBalance,
  type CustodyProvenance,
  type RawCustodyAccount,
} from "@/lib/data/custody-aggregate";

export interface CustodySnapshot {
  provenance: CustodyProvenance;
  /** True when FIREBLOCKS_VAULT_ACCOUNT_IDS pins the reserve scope. */
  configured: boolean;
  asOf: string;
  accountsCount: number;
  totalUsdcReserves: number;
  accounts: CustodyAccountBalance[];
}

function manualFallback(): CustodySnapshot {
  return {
    provenance: "manual",
    configured: false,
    asOf: new Date().toISOString(),
    accountsCount: 0,
    totalUsdcReserves: 0,
    accounts: [],
  };
}

/**
 * Live Proof-of-Reserves from Fireblocks via a read-only Viewer key. Never
 * throws — missing config or any upstream failure degrades to a `manual`
 * snapshot so the Proof Center keeps rendering.
 *
 * The reserve scope is pinned by `FIREBLOCKS_VAULT_ACCOUNT_IDS` (comma-separated
 * vault account ids). When unset, every account is returned with
 * `configured: false` so the consumer can flag the scope as not yet pinned.
 */
export async function loadCustody(): Promise<CustodySnapshot> {
  const apiKey = env.FIREBLOCKS_API_KEY;
  const secretPath = env.FIREBLOCKS_SECRET_KEY_PATH;
  const basePath = env.FIREBLOCKS_BASE_URL;
  if (!apiKey || !secretPath || !basePath) return manualFallback();

  try {
    // Dynamic import: @fireblocks/ts-sdk@19 has a static `require('uuid')`
    // that breaks on Vercel because uuid@14 is ESM-only (ERR_REQUIRE_ESM).
    // Loading lazily inside the try/catch lets the failure degrade to the
    // manual fallback instead of crashing the route at module-eval time.
    const { Fireblocks } = await import("@fireblocks/ts-sdk");
    const secretKey = readFileSync(secretPath, "utf8");
    const fb = new Fireblocks({ apiKey, secretKey, basePath });
    const res = await fb.vaults.getPagedVaultAccounts({ limit: 200 });

    const raw: RawCustodyAccount[] = (res.data?.accounts ?? []).map((a) => ({
      id: String(a.id ?? ""),
      name: a.name ?? "",
      assets: (a.assets ?? []).map((x) => ({
        id: String(x.id ?? ""),
        total: Number(x.total ?? 0),
      })),
    }));

    const accountIds = (env.FIREBLOCKS_VAULT_ACCOUNT_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { accounts, totalUsdcReserves } = aggregateCustody(raw, { accountIds });

    return {
      provenance: "live",
      configured: accountIds.length > 0,
      asOf: new Date().toISOString(),
      accountsCount: accounts.length,
      totalUsdcReserves,
      accounts,
    };
  } catch {
    return manualFallback();
  }
}
