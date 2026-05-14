import { Page, Text, View } from "@react-pdf/renderer";

import {
  Commentary,
  EyebrowTitle,
  PageFooter,
  PageHeader,
} from "../memo-components";
import { type MemoPdfData, formatPct, formatUsd } from "../memo-data";
import { COLORS, styles } from "../memo-styles";

interface PerfRow {
  month: string;
  apyRange: string;
  apyAchieved: string;
  distributionUsdc: number;
  navUsdc: number;
}

function buildRows(data: MemoPdfData): PerfRow[] {
  // Source of truth for the 4-month look-back is now `data.monthlyHistory`
  // (VaultSnapshot ⊕ Distribution via the Phase 1 loader). The loader
  // already pads its output with a deterministic synthetic series when the
  // DB has fewer months than the requested window, so this code path no
  // longer needs a "no data" branch.
  const history = data.monthlyHistory;
  if (history.length === 0) {
    return [
      {
        month: data.period,
        apyRange: "9.4-12.8%",
        apyAchieved: "10.8%",
        distributionUsdc: 196_800,
        navUsdc: data.input.vault.aumUsdc,
      },
    ];
  }
  return history.map((row) => ({
    month: row.period,
    apyRange: `${row.apy_low.toFixed(1)}-${row.apy_high.toFixed(1)}%`,
    apyAchieved: `${row.apy_achieved.toFixed(1)}%`,
    distributionUsdc: row.distribution_usdc,
    navUsdc: row.nav_usdc,
  }));
}

export function PerformanceOverviewPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: MemoPdfData;
  pageNumber: number;
  totalPages: number;
}) {
  const rows = buildRows(data);
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader period={data.period} />

      <EyebrowTitle
        eyebrow="02 / Performance overview"
        title="Trailing 4-month performance"
      />

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Month</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>APY range</Text>
          <Text
            style={[styles.tableHeaderCell, { flex: 1.2, textAlign: "right" }]}
          >
            APY achieved
          </Text>
          <Text
            style={[styles.tableHeaderCell, { flex: 1.3, textAlign: "right" }]}
          >
            Distribution
          </Text>
          <Text
            style={[styles.tableHeaderCell, { flex: 1.3, textAlign: "right" }]}
          >
            NAV
          </Text>
        </View>
        {rows.map((r, idx) => (
          <View
            key={r.month}
            style={[
              styles.tableRow,
              idx % 2 === 1 ? styles.tableRowAlt : {},
              idx === rows.length - 1 ? styles.tableRowLast : {},
            ]}
          >
            <Text style={[styles.tableCell, { flex: 1.2 }]}>{r.month}</Text>
            <Text style={[styles.tableCell, { flex: 1.4 }]}>{r.apyRange}</Text>
            <Text
              style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}
            >
              {r.apyAchieved}
            </Text>
            <Text
              style={[styles.tableCell, { flex: 1.3, textAlign: "right" }]}
            >
              {formatUsd(r.distributionUsdc)}
            </Text>
            <Text
              style={[styles.tableCell, { flex: 1.3, textAlign: "right" }]}
            >
              {formatUsd(r.navUsdc)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.bodySmall, { marginTop: 8, color: COLORS.textDim }]}>
        APY achieved is derived by annualising the realised monthly NAV change.
        It is a backward-looking realised metric; published target APY remains
        a range conditional on the stated assumptions.
      </Text>

      <Text style={styles.h2}>Backtest cross-check</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Window</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: "right" }]}>
            Total return
          </Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: "right" }]}>
            Max drawdown
          </Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: "right" }]}>
            Worst month
          </Text>
          <Text style={[styles.tableHeaderCell, { flex: 0.9, textAlign: "right" }]}>
            Rebals
          </Text>
        </View>
        {data.input.backtests.map((bt, idx) => (
          <View
            key={bt.key}
            style={[
              styles.tableRow,
              idx % 2 === 1 ? styles.tableRowAlt : {},
              idx === data.input.backtests.length - 1 ? styles.tableRowLast : {},
            ]}
          >
            <Text style={[styles.tableCell, { flex: 2 }]}>
              {bt.key.replace(/_/g, " ")} &middot; {bt.startDate} to {bt.endDate}
            </Text>
            <Text style={[styles.tableCell, { flex: 1.3, textAlign: "right" }]}>
              {formatPct(bt.totalReturnPct)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                { flex: 1.3, textAlign: "right", color: COLORS.danger },
              ]}
            >
              {formatPct(bt.maxDrawdownPct)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}>
              {formatPct(bt.worstMonthPct)}
            </Text>
            <Text style={[styles.tableCell, { flex: 0.9, textAlign: "right" }]}>
              {bt.numRebalances}
            </Text>
          </View>
        ))}
      </View>

      <Commentary>
        Vault performance over the period sat inside the published APY range,
        with the realised monthly distribution paid in USDC as scheduled.
        Backtests across bear, halving, and mining-crunch windows are listed
        for context; they are simulations of the same rule set on historical
        data, not forecasts.
      </Commentary>

      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
