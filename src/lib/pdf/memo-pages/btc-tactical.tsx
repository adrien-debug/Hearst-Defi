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
import { COLORS, styles } from "../memo-styles";

function triggerTone(kind: string, armed: boolean): PillTone {
  if (!armed) return "neutral";
  if (kind === "accumulate") return "brand";
  if (kind === "take_profit") return "success";
  if (kind === "reduce_size") return "warning";
  return "neutral";
}

function guardrailTone(status: string): PillTone {
  if (status === "breached") return "danger";
  if (status === "warning") return "warning";
  if (status === "healthy") return "success";
  return "neutral";
}

export function BtcTacticalPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: MemoPdfData;
  pageNumber: number;
  totalPages: number;
}) {
  // Use BTC tactical state from the mode-matched scenario.
  const baseScenario =
    data.input.scenarios.find((s) => s.mode === data.input.vault.mode) ??
    data.input.scenarios[0];
  const tactical = baseScenario?.btc_tactical;
  const targetPct = tactical?.targetExposurePct ?? 0;
  const triggers = tactical?.triggers ?? [];
  const guardrails = tactical?.guardrails ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader period={data.period} />

      <EyebrowTitle
        eyebrow="04 / BTC tactical sleeve"
        title="Exposure, triggers, guardrails"
      />

      <View style={styles.twoColGrid}>
        <KpiCell
          label="Target exposure"
          value={`${targetPct}%`}
          hint="of AUM, rule-bound"
        />
        <KpiCell
          label="Triggers armed"
          value={`${triggers.filter((t) => t.armed).length} / ${triggers.length}`}
          hint="PTAI framework only"
        />
        <KpiCell
          label="Guardrails"
          value={`${guardrails.length} active`}
          hint="Volatility, margin, concentration"
        />
      </View>

      <Text style={styles.h2}>Active PTAI triggers</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>Kind</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2.4 }]}>Condition</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2.4 }]}>Action</Text>
          <Text
            style={[styles.tableHeaderCell, { flex: 0.9, textAlign: "right" }]}
          >
            Status
          </Text>
        </View>
        {triggers.length === 0 ? (
          <View style={[styles.tableRow, styles.tableRowLast]}>
            <Text style={[styles.tableCellMuted, { flex: 1 }]}>
              No active triggers in the current vault state.
            </Text>
          </View>
        ) : (
          triggers.map((t, idx) => (
            <View
              key={t.id}
              style={[
                styles.tableRow,
                idx % 2 === 1 ? styles.tableRowAlt : {},
                idx === triggers.length - 1 ? styles.tableRowLast : {},
              ]}
            >
              <Text style={[styles.tableCell, { flex: 1.1 }]}>
                {t.kind.replace(/_/g, " ")}
              </Text>
              <Text style={[styles.tableCell, { flex: 2.4 }]}>
                {t.condition}
              </Text>
              <Text style={[styles.tableCell, { flex: 2.4 }]}>{t.action}</Text>
              <View style={{ flex: 0.9, alignItems: "flex-end" }}>
                <StatusPill
                  label={t.armed ? "armed" : "idle"}
                  tone={triggerTone(t.kind, t.armed)}
                />
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.h2}>Guardrails</Text>
      <View style={{ gap: 6 }}>
        {guardrails.map((g) => (
          <View
            key={g.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 4,
            }}
          >
            <View style={{ flex: 1.5 }}>
              <Text
                style={[styles.tableCell, { fontFamily: "Helvetica-Bold" }]}
              >
                {g.label}
              </Text>
              <Text style={styles.bodySmall}>{g.detail}</Text>
            </View>
            <StatusPill label={g.status} tone={guardrailTone(g.status)} />
          </View>
        ))}
      </View>

      <Commentary>
        The BTC tactical sleeve operates under the PTAI framework: every
        change is bound to a published trigger (Projection - Trigger - Action
        - Impact). There is no discretionary trading. Triggers and guardrails
        listed above are the live rule set for the current vault state.
      </Commentary>

      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
