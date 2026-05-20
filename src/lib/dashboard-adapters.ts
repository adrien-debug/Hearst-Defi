import type { Provenance } from "@/components/ui/provenance-badge";
import type { DashboardData } from "@/lib/data/dashboard";
import type { MiningHealth } from "@/lib/mock/dashboard";
import type { MiningHealthHashprice } from "@/components/dashboard/mining-health";

export function toMiningHealth(
  data: DashboardData,
  source: DashboardData["source"],
): MiningHealth {
  const provenance: Provenance =
    source === "fallback" ? "stale" : "attested";
  return {
    marginScore: data.vault.miningMarginScore,
    hashpriceTrendPct: data.hashpriceTrendPct,
    opConfidence: data.operationalConfidence,
    provenance,
  };
}

export function toHashpriceRow(
  hashprice: { usd_per_th_day: number; stale: boolean },
): MiningHealthHashprice | null {
  if (hashprice.usd_per_th_day <= 0) return null;
  return {
    usd_per_th_day: hashprice.usd_per_th_day,
    stale: hashprice.stale,
  };
}
