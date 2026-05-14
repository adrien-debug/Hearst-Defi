import { Page, Rect, Svg, Text, View } from "@react-pdf/renderer";

import {
  EyebrowTitle,
  PageFooter,
  PageHeader,
} from "../memo-components";
import { type MemoPdfData } from "../memo-data";
import {
  ALLOCATION_HINTS,
  ALLOCATION_LABELS,
  ALLOCATION_PALETTE,
  COLORS,
  styles,
} from "../memo-styles";

const CHART_WIDTH = 460;
const CHART_HEIGHT = 28;

export function AllocationBreakdownPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: MemoPdfData;
  pageNumber: number;
  totalPages: number;
}) {
  const baseScenario =
    data.input.scenarios.find((s) => s.mode === data.input.vault.mode) ??
    data.input.scenarios[0];

  const allocations = baseScenario?.allocations ?? [];
  const totalPct = allocations.reduce((sum, a) => sum + a.pct, 0) || 100;

  // Pre-compute x offsets for the stacked bar.
  let cursor = 0;
  const segments = allocations.map((a) => {
    const width = (a.pct / totalPct) * CHART_WIDTH;
    const x = cursor;
    cursor += width;
    return {
      bucket: a.bucket,
      pct: a.pct,
      yieldBps: a.yield_contribution_bps,
      width,
      x,
      fill: ALLOCATION_PALETTE[a.bucket] ?? COLORS.borderStrong,
    };
  });

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader period={data.period} />

      <EyebrowTitle
        eyebrow="06 / Allocation breakdown"
        title="Four buckets, regime-aware"
      />

      <Text style={styles.bodyMuted}>
        Allocation buckets are mandated by methodology v1.0. The bar below
        shows the current weight of each bucket; bucket yield contribution is
        published in basis points alongside the regime mode.
      </Text>

      <View style={{ marginTop: 14 }}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {segments.map((s) => (
            <Rect
              key={s.bucket}
              x={s.x}
              y={0}
              width={s.width}
              height={CHART_HEIGHT}
              fill={s.fill}
            />
          ))}
          <Rect
            x={0}
            y={0}
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            stroke={COLORS.borderStrong}
            strokeWidth={0.5}
            fill="transparent"
          />
        </Svg>
      </View>

      <View style={styles.allocationLegend}>
        {segments.map((s) => (
          <View key={s.bucket} style={styles.allocationLegendRow}>
            <View
              style={[styles.allocationSwatch, { backgroundColor: s.fill }]}
            />
            <Text style={styles.allocationLabel}>
              {ALLOCATION_LABELS[s.bucket] ?? s.bucket}
            </Text>
            <Text style={styles.allocationPct}>{s.pct.toFixed(0)}%</Text>
            <Text style={styles.allocationHint}>
              {ALLOCATION_HINTS[s.bucket] ?? ""}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.h2}>Yield contribution by bucket</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Bucket</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>
            Weight
          </Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.4, textAlign: "right" }]}>
            Yield contribution
          </Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.6, textAlign: "right" }]}>
            % of yield
          </Text>
        </View>
        {(() => {
          const totalBps =
            segments.reduce((sum, s) => sum + s.yieldBps, 0) || 1;
          return segments.map((s, idx) => (
            <View
              key={s.bucket}
              style={[
                styles.tableRow,
                idx % 2 === 1 ? styles.tableRowAlt : {},
                idx === segments.length - 1 ? styles.tableRowLast : {},
              ]}
            >
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {ALLOCATION_LABELS[s.bucket] ?? s.bucket}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                {s.pct.toFixed(0)}%
              </Text>
              <Text
                style={[styles.tableCell, { flex: 1.4, textAlign: "right" }]}
              >
                {s.yieldBps} bps
              </Text>
              <Text
                style={[styles.tableCell, { flex: 1.6, textAlign: "right" }]}
              >
                {((s.yieldBps / totalBps) * 100).toFixed(0)}%
              </Text>
            </View>
          ));
        })()}
      </View>

      <Text style={[styles.bodySmall, { marginTop: 12 }]}>
        Weights reflect the current vault mode ({data.input.vault.mode}). Yield
        contribution is in basis points under methodology v1.0; numbers shift
        when the regime changes via rules R1-R8.
      </Text>

      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
