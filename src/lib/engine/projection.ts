// Pure projection engine — no I/O, no DB, no fetch, no Date.now().
// CLAUDE.md non-negotiables:
//   #1  APY always a range (low–high), never a single point.
//   #6  Engine purity: zero side-effects.
//   #5  Forbidden words must not appear in output strings.

/** Minimal vault draft shape the footer needs.
 *  Mirrors the relevant fields from CreateDraftInput + colorTag (FormState). */
export interface VaultDraft {
  targetApyLowBps: number;
  targetApyHighBps: number;
  mgmtFeeBps: number;
  perfFeeBps: number;
  softLockupDays: number;
  requiredSigners: number;
  signersWhitelist: string[];
  targetMiningBps: number;
  targetBtcTacticalBps: number;
  targetUsdcBaseBps: number;
  targetStableReserveBps: number;
}

export interface ProjectionResult {
  /** APY low end in percent (after fees), e.g. 9.4 */
  apyLow: number;
  /** APY high end in percent (after fees), e.g. 12.8 */
  apyHigh: number;
  /** Formatted range string using en-dash, e.g. "9.4–12.8%" */
  apyRangeLabel: string;
  /** Lockup in days */
  lockupDays: number;
  /** Multisig quorum, e.g. "3/5" */
  quorum: string;
  /** Assumptions surfaced per non-negotiable #10 */
  assumptions: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Mgmt fee is charged as an annual drag on the gross APY range.
// We apply it symmetrically (same bps subtracted from low and high).
// Perf fee is modelled as a haircut on the gross spread above the low.
// Formula:
//   grossLow  = targetApyLowBps / 100
//   grossHigh = targetApyHighBps / 100
//   mgmtDrag  = mgmtFeeBps / 100          (same drag on both ends)
//   perfHaircut = (grossHigh - grossLow) * perfFeeBps / 10000
//   netLow    = max(0, grossLow - mgmtDrag)
//   netHigh   = max(netLow, grossHigh - mgmtDrag - perfHaircut)
// The 10-basis-point floor ensures the range never collapses to a single point.

const MIN_SPREAD_PCT = 0.1; // minimum spread between low and high (percent)

/**
 * Pure function: derive live APY range + display metadata from a vault draft.
 *
 * Engine purity rules apply: no `import`, no `fetch`, no `Date.now()`,
 * no `Math.random()`, no process.env.
 */
export function projectVaultApy(draft: VaultDraft): ProjectionResult {
  const grossLow = draft.targetApyLowBps / 100;
  const grossHigh = draft.targetApyHighBps / 100;

  const mgmtDrag = draft.mgmtFeeBps / 100;
  const grossSpread = Math.max(0, grossHigh - grossLow);
  const perfHaircut = grossSpread * (draft.perfFeeBps / 10_000);

  const netLow = Math.max(0, grossLow - mgmtDrag);
  const netHighRaw = Math.max(0, grossHigh - mgmtDrag - perfHaircut);
  // enforce minimum spread
  const netHigh = Math.max(netHighRaw, netLow + MIN_SPREAD_PCT);

  const fmt = (n: number) => n.toFixed(1);
  const apyRangeLabel = `${fmt(netLow)}–${fmt(netHigh)}%`;

  const validSigners = draft.signersWhitelist.filter((s) => s.trim().length > 0).length;
  const effectiveSigners = Math.max(validSigners, draft.requiredSigners);
  const quorum = `${draft.requiredSigners}/${effectiveSigners}`;

  const assumptions: string[] = [
    `Gross APY target: ${fmt(grossLow)}–${fmt(grossHigh)}%. Net shown after ${fmt(mgmtDrag)}% mgmt fee and ${fmt(draft.perfFeeBps / 100)}% perf fee on spread.`,
    `Allocation: mining ${fmt(draft.targetMiningBps / 100)}% · BTC tactical ${fmt(draft.targetBtcTacticalBps / 100)}% · USDC base ${fmt(draft.targetUsdcBaseBps / 100)}% · stable reserve ${fmt(draft.targetStableReserveBps / 100)}%.`,
    "Range is an estimate based on historical inputs. Final terms after deployment. Past performance does not predict future results.",
  ];

  return {
    apyLow: netLow,
    apyHigh: netHigh,
    apyRangeLabel,
    lockupDays: draft.softLockupDays,
    quorum,
    assumptions,
  };
}
