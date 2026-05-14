import { Page, Text, View } from "@react-pdf/renderer";

import {
  type MemoPdfData,
  formatApyRange,
  formatUsd,
} from "../memo-data";
import { COLORS, styles } from "../memo-styles";

export function CoverPage({ data }: { data: MemoPdfData }) {
  const { input, period, generatedAt } = data;
  const dateLabel = new Date(generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverTop}>
        <View>
          <Text style={styles.coverWordmark}>
            HEARST <Text style={styles.coverWordmarkAccent}>CONNECT</Text>
          </Text>
        </View>
        <View style={styles.coverBrandDot} />
      </View>

      <View style={styles.coverRule} />

      <Text style={styles.coverTitle}>
        Hearst Yield Vault{"\n"}Monthly Investor Memo
      </Text>
      <Text style={styles.coverSubtitle}>
        Mining-backed structured yield. Monthly USDC distributions. Cayman SPV,
        $250k minimum, 60-day soft lock-up. Methodology v1.0.
      </Text>

      <View style={styles.coverKpiGrid}>
        <View style={styles.coverKpi}>
          <Text style={styles.coverKpiLabel}>Period</Text>
          <Text style={styles.coverKpiValue}>{period}</Text>
          <Text style={styles.coverKpiHint}>Generated {dateLabel} UTC</Text>
        </View>
        <View style={styles.coverKpi}>
          <Text style={styles.coverKpiLabel}>Target APY range</Text>
          <Text style={styles.coverKpiValue}>
            {formatApyRange(input.vault.apyRange)}
          </Text>
          <Text style={styles.coverKpiHint}>
            Range, not point estimate &middot; vault mode {input.vault.mode}
          </Text>
        </View>
        <View style={styles.coverKpi}>
          <Text style={styles.coverKpiLabel}>AUM</Text>
          <Text style={styles.coverKpiValue}>
            {formatUsd(input.vault.aumUsdc)}
          </Text>
          <Text style={styles.coverKpiHint}>USDC, end-of-period snapshot</Text>
        </View>
        <View style={styles.coverKpi}>
          <Text style={styles.coverKpiLabel}>Risk score</Text>
          <Text style={styles.coverKpiValue}>{input.vault.riskScore} / 100</Text>
          <Text style={styles.coverKpiHint}>
            Composite, methodology v1.0 weighting
          </Text>
        </View>
      </View>

      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>
          CONFIDENTIAL &middot; ACCREDITED INVESTORS ONLY
        </Text>
        <Text style={[styles.coverFooterText, { color: COLORS.textDim }]}>
          HEARST CONNECT &middot; hearst-connect.com
        </Text>
      </View>
    </Page>
  );
}
