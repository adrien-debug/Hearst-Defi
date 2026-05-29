import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/ui/metric";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";

/**
 * Mining Cash-Flow Evidence — the RWA proof that matters most for this product:
 * the yield source. Reserves prove the principal is custodied; THIS proves the
 * distribution is funded by real mining revenue.
 *
 * Pre-launch posture: no mining revenue period has settled yet, so every field
 * is "Pending" with an honest `manual`/`estimated` badge — never `live`. When
 * the first revenue-share period closes, these become attested figures
 * (period, net revenue, coverage ratio, evidence hash/CID).
 */
export function MiningCashFlowEvidence() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Mining cash-flow evidence</span>
          <CardTitle>Yield source — Bitcoin mining revenue</CardTitle>
        </div>
        <ProvenanceBadge kind="manual" />
      </CardHeader>

      <p className="body-sm mb-4">
        The monthly distribution is funded by a Bitcoin mining revenue-share.
        Each period, net mining revenue and the resulting distribution coverage
        are attested here alongside the custody proof-of-reserves. No revenue
        period has settled yet — figures populate after the first period close.
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric
          label="Distribution coverage"
          value="Pending"
          sublabel="net mining cash ÷ target"
          provenance="estimated"
        />
        <Metric
          label="Latest revenue period"
          value="—"
          sublabel="awaiting first close"
          provenance="manual"
        />
        <Metric
          label="Attestation status"
          value="Pending"
          sublabel="mining partner + pool"
          provenance="manual"
        />
        <Metric
          label="Evidence (hash / CID)"
          value="—"
          sublabel="published per period"
          provenance="manual"
        />
      </div>
    </Card>
  );
}
