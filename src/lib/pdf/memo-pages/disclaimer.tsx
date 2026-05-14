import { Page, Text, View } from "@react-pdf/renderer";

import {
  EyebrowTitle,
  PageFooter,
  PageHeader,
} from "../memo-components";
import { type MemoPdfData, stripMarkdown } from "../memo-data";
import { COLORS, styles } from "../memo-styles";

const FALLBACK_DISCLAIMER =
  "Projections are conditional on the stated assumptions. Past performance does not indicate future results and outcomes are not guaranteed. Hearst Yield Vault is offered exclusively to professional and qualified investors via a Cayman Exempted Limited Partnership, subject to minimum subscription, soft lock-up, and jurisdictional restrictions. This material is not an offer or solicitation where prohibited.\n\nThis is a forward-looking projection based on the stated assumptions and the Hearst methodology version referenced in the output. Actual results will differ. Range outputs (APY low / high) reflect modelled uncertainty and are not maxima or minima. No outcome is investment advice or a representation that any specific result will be achieved.";

export function DisclaimerPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: MemoPdfData;
  pageNumber: number;
  totalPages: number;
}) {
  const disclaimerBody = data.memo
    ? stripMarkdown(data.memo.disclaimer)
    : FALLBACK_DISCLAIMER;

  const methodologyBody = data.memo
    ? stripMarkdown(data.memo.methodology_note)
    : "Outputs follow Hearst methodology v1.0. APY is published as a range, not a point. The five canonical risks are tracked under a composite score. Backtests apply the same rule set R1-R8 to historical windows; they are simulations, not forecasts.";

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader period={data.period} />

      <EyebrowTitle
        eyebrow="07 / Methodology & disclaimers"
        title="What is not guaranteed"
      />

      <Text style={styles.h2}>Methodology</Text>
      <Text style={styles.bodyMuted}>{methodologyBody}</Text>

      <Text style={styles.h2}>Disclaimer</Text>
      <View style={styles.disclaimerBox}>
        <Text style={[styles.bodySmall, { color: COLORS.textPrimary }]}>
          {disclaimerBody}
        </Text>
      </View>

      <Text style={styles.h2}>Subscription terms</Text>
      <Text style={styles.bodyMuted}>
        Cayman Exempted Limited Partnership. Minimum subscription $250,000.
        60-day soft lock-up. Monthly USDC distributions. Subscription is
        restricted to accredited / professional investors as defined under the
        relevant jurisdiction. The vehicle is not offered where prohibited by
        law.
      </Text>

      <Text style={styles.h2}>Contact</Text>
      <Text style={styles.bodyMuted}>
        Hearst Connect &middot; ir@hearst-connect.com &middot;
        hearst-connect.com
      </Text>

      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
