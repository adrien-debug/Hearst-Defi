// ---------------------------------------------------------------------------
// PTAI Projection lookup.
//
// `RebalanceEvent` rows in Prisma store Trigger / Action / Impact verbatim
// (`triggerText`, `actionText`, `impactText`) but no Projection field. The
// Projection line in the PTAI standard (`/docs/spec/07-rebalancing-rules.mdx`)
// is the rule's underlying *hypothesis* — the one-line statement of what the
// rule expects to happen if the trigger fires. That is a property of the rule,
// not of the event, so deriving it from `ruleId` at render time is correct.
//
// Pure data, safe to import from anywhere (client or server). No I/O.
// ---------------------------------------------------------------------------

interface ProjectionDef {
  /** One-line hypothesis describing what the rule projects under its trigger. */
  hypothesis: string;
}

const PROJECTIONS: Record<string, ProjectionDef> = {
  // ---- Global rules (R1–R8) ---------------------------------------------
  R1: {
    hypothesis:
      "BTC drawdown beyond 25% on 30d implies elevated tail risk; defensive mode contains downside.",
  },
  R2: {
    hypothesis:
      "Mining margin below 60 suggests hashprice compression; reducing mining sleeve protects realised APY.",
  },
  R3: {
    hypothesis:
      "Mining margin above 70 plus positive BTC momentum supports rotating into mining for higher carry.",
  },
  R4: {
    hypothesis:
      "Hashprice trending between −5% and 0% sits in the watchlist band; monitoring expected, no action.",
  },
  R5: {
    hypothesis:
      "Mode shift between regimes recalibrates targets to the active band; APY range adjusts accordingly.",
  },
  R6: {
    hypothesis:
      "Sustained vol index above 80 indicates regime stress; halving BTC tactical caps drawdown contribution.",
  },
  R7: {
    hypothesis:
      "DeFi protocol risk above 70 indicates contagion potential; progressive exit limits exposure.",
  },
  R8: {
    hypothesis:
      "Single-protocol concentration above 30% raises smart-contract risk; forced diversification mitigates it.",
  },

  // ---- BTC tactical rules (R-BTC-*) -------------------------------------
  "R-BTC-1": {
    hypothesis:
      "BTC trading 20% below 90d high marks an accumulation window if mining margin remains healthy.",
  },
  "R-BTC-2": {
    hypothesis:
      "BTC trading 35% below 90d high deepens the accumulation case; staged adds expected.",
  },
  "R-BTC-3": {
    hypothesis:
      "BTC at 1.3x average entry triggers a partial take-profit if the sleeve exceeds 10% of AUM.",
  },
  "R-BTC-4": {
    hypothesis:
      "BTC at 1.6x average entry triggers a deeper take-profit, rotating P&L into USDC base.",
  },
  "R-BTC-5": {
    hypothesis:
      "Realised volatility above 90% over 30d triggers a defensive trim regardless of P&L.",
  },
  "R-BTC-6": {
    hypothesis:
      "Mining margin below 50 disables BTC accumulation and pauses additions to the tactical sleeve.",
  },

  // ---- Distribution events ----------------------------------------------
  "R-DIST-1": {
    hypothesis:
      "Monthly USDC distribution from realised mining cashflow plus base-yield accrual once attestation v1 is received.",
  },
};

const KIND_FALLBACK_PROJECTION: Record<
  "rebalance" | "distribution" | "alert",
  string
> = {
  rebalance:
    "Rebalancing rule evaluated against current market and operational state.",
  distribution:
    "Periodic USDC distribution from realised yield and mining cashflow.",
  alert:
    "Watchlist signal observed; logged for operator review, no allocation change.",
};

/**
 * Returns the Projection hypothesis line for a given rule ID.
 *
 * Falls back to a kind-keyed generic sentence when the rule is not in the
 * registry — keeps the PTAI block intact for any future rule that has not yet
 * been catalogued here.
 */
export function projectionFor(
  ruleId: string,
  kind: "rebalance" | "distribution" | "alert",
): string {
  const def = PROJECTIONS[ruleId];
  if (def) return def.hypothesis;
  return KIND_FALLBACK_PROJECTION[kind];
}

/**
 * Exposed only for tests / introspection.
 */
export function listKnownRuleIds(): string[] {
  return Object.keys(PROJECTIONS);
}
