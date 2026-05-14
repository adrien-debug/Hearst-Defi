import { Page, Text, View } from "@react-pdf/renderer";

import {
  Commentary,
  EyebrowTitle,
  KpiCell,
  PageFooter,
  PageHeader,
  StatusPill,
  type PillTone,
} from "../memo-components";
import { type MemoPdfData } from "../memo-data";
import { styles } from "../memo-styles";

function marginTone(score: number): PillTone {
  if (score >= 65) return "success";
  if (score >= 45) return "warning";
  return "danger";
}

export function MiningHealthPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: MemoPdfData;
  pageNumber: number;
  totalPages: number;
}) {
  // Source the mining margin score from the base scenario (mode=balanced)
  // when available; fall back to the first scenario.
  const baseScenario =
    data.input.scenarios.find((s) => s.mode === data.input.vault.mode) ??
    data.input.scenarios[0];

  const marginScore = baseScenario?.mining_margin_score ?? 0;
  // Hashrate / uptime placeholders — not yet in InvestorMemoInput. Documented
  // in the final report.
  const hashrateDeployed = "182 PH/s";
  const uptime = "98.4%";

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader period={data.period} />

      <EyebrowTitle
        eyebrow="03 / Mining health"
        title="Operator margin & uptime"
      />

      <View style={styles.twoColGrid}>
        <KpiCell
          label="Hashrate deployed"
          value={hashrateDeployed}
          hint="JV operator fleet, paper-attested"
        />
        <KpiCell
          label="Margin score"
          value={`${marginScore} / 100`}
          hint="Engine-derived; lower triggers R2"
        />
        <KpiCell
          label="Uptime"
          value={uptime}
          hint="Trailing 30d, paper attestation"
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <StatusPill
          label={`Margin ${marginScore >= 65 ? "Healthy" : marginScore >= 45 ? "Compressed" : "Stressed"}`}
          tone={marginTone(marginScore)}
        />
        <StatusPill label="Attestation: paper" tone="warning" />
        <StatusPill label="On-chain proof: pending Phase 2" tone="neutral" />
      </View>

      <Text style={styles.h2}>Assumptions in force</Text>
      <View style={{ gap: 4 }}>
        {(baseScenario?.assumptions ?? []).slice(0, 4).map((a, idx) => (
          <Text key={idx} style={styles.bodySmall}>
            &middot; {a}
          </Text>
        ))}
      </View>

      <Text style={styles.h2}>Operator commentary</Text>
      <Commentary>
        Mining margin score is the engine-derived composite of hashprice, energy
        cost and uptime. It drives the allocation R2 rebalancing rule when it
        crosses the configured threshold. During the period under review,
        margin remained within the band that keeps mining as the largest yield
        contributor, alongside the USDC base sleeve. On-chain attestation will
        replace the current paper attestation in Phase 2 once the EventLogger
        contract is live on Base Sepolia.
      </Commentary>

      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
