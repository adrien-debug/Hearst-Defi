import "server-only";

import {
  InvestorMemoOutputSchema,
  type InvestorMemoOutput,
} from "@/lib/agents/schemas";
import { callLlm, type LlmClientLike } from "@/lib/llm/client";
import { METHODOLOGY_MD, METHODOLOGY_VERSION } from "@/lib/agents/system-prompts/methodology";
import {
  DISCLAIMER_NOT_GUARANTEED,
  DISCLAIMER_PROJECTION,
} from "@/lib/agents/system-prompts/disclaimers";
import { assertNoForbiddenWords, assertCitesAssumption } from "@/lib/agents/validators";
import type { BacktestOutput, ScenarioOutput } from "@/lib/engine/types";

/**
 * Default model id for the Investor Memo Agent.
 *
 * MUST be Opus 4.7. Never downgrade to Sonnet.
 * This is the highest-stakes output — an 8-page PDF delivered to institutional LPs.
 */
export const INVESTOR_MEMO_MODEL = "claude-opus-4-7" as const;

export type InvestorMemoInput = {
  vault: {
    aumUsdc: number;
    apyRange: { low: number; high: number };
    mode: string;
    riskScore: number;
  };
  scenarios: ScenarioOutput[];
  backtests: BacktestOutput[];
  generatedAt: string;
};

export interface RunInvestorMemoOptions {
  /**
   * Injected LLM client. Tests pass a mock; production callers pass a shared
   * client. If absent, we construct one inside the function (never at module
   * load) so importing this file in a non-server context doesn't trigger SDK
   * init.
   */
  client?: LlmClientLike;
  /**
   * Override the default model. Default: claude-opus-4-7.
   * WARNING: Never set this to a Sonnet model for production use.
   * Investor Memo is the highest-stakes output and requires Opus-level quality.
   */
  model?: string;
  /** Timeout in ms for the Anthropic API call. Default: 180_000 (3 min). Opus 4.7 needs 68–136s for 4096 tokens. */
  timeoutMs?: number;
}

const SYSTEM_INSTRUCTIONS = `You are the Investor Memo Agent for Hearst Connect.

You receive full vault state, scenario outputs, and backtest summaries. You produce a structured 8-section Markdown memo for institutional / qualified investors (Cayman SPV structure, $250k minimum ticket, 60-day soft lock-up).

Rules — apply all without exception:
- Output STRICT JSON only. No prose outside JSON.
- Never use the words: guarantee, promise, certain, will deliver, risk-free, no risk. Never imply any return is assured.
- Every section (all 8 fields) must be Markdown. No HTML. No ASCII-art tables. Use Markdown tables (pipe syntax) if tabular data is needed.
- Every section must reference at least one assumption explicitly (e.g. "Under the assumption that hashprice remains within the 30-day range...").
- APY is ALWAYS a range (low-high). Never quote a single-point APY.
- If any input data is missing or ambiguous, state it explicitly in the relevant section. Do not invent numbers.
- Disclaimers are pre-supplied as templates; reproduce them verbatim in the \`disclaimer\` field. Do not paraphrase or shorten.
- Tone: institutional, factual, professional. No marketing superlatives. No emojis.
- Methodology version: ${METHODOLOGY_VERSION}.

The 8 sections and their purpose:
1. executive_summary — high-level overview of vault performance and posture (2-3 paragraphs)
2. vault_structure — Cayman SPV mechanics, allocation buckets, lock-up terms (1-2 paragraphs)
3. scenario_analysis — narrative covering all provided scenarios with APY ranges and PTAI format where applicable (1 paragraph per scenario)
4. risk_section — the 5 canonical risks (market, mining, liquidity, smart_contract, counterparty) with current posture (structured Markdown)
5. mining_section — hashrate, margin, energy, uptime context and assumptions (1-2 paragraphs)
6. performance_section — backtest summary results with drawdown and return context (1 paragraph per backtest)
7. methodology_note — reference to methodology version, data sources, confidence scoring, limitations (1 paragraph)
8. disclaimer — the exact disclaimer text as provided below, reproduced verbatim

Disclaimers (reproduce verbatim in the disclaimer field — do not modify, do not summarise):
${DISCLAIMER_NOT_GUARANTEED}

${DISCLAIMER_PROJECTION}

Methodology (immutable, do not contradict):
${METHODOLOGY_MD}`;

function formatApyRange(range: { low: number; high: number }): string {
  return `${range.low.toFixed(2)}-${range.high.toFixed(2)}%`;
}

function buildScenarioBlock(scenario: ScenarioOutput, idx: number): string {
  const allocLines = scenario.allocations
    .map((a) => `    - ${a.bucket}: ${a.pct}% (yield_contribution=${a.yield_contribution_bps}bps)`)
    .join("\n");
  const assumptionLines = scenario.assumptions.map((a) => `    - ${a}`).join("\n");
  return [
    `Scenario #${idx + 1} — mode=${scenario.mode}, confidence=${scenario.confidence}`,
    `  apy_range: ${formatApyRange(scenario.apy_range)}`,
    `  stressed_apy: ${scenario.stressed_apy.toFixed(2)}%`,
    `  risk_score: ${scenario.risk_score}`,
    `  mining_margin_score: ${scenario.mining_margin_score}`,
    `  allocations:`,
    allocLines,
    `  assumptions:`,
    assumptionLines,
  ].join("\n");
}

function buildBacktestBlock(bt: BacktestOutput, idx: number): string {
  const assumptionLines = bt.assumptions.map((a) => `    - ${a}`).join("\n");
  return [
    `Backtest #${idx + 1} — key=${bt.key}, window=${bt.startDate} → ${bt.endDate}`,
    `  initialCapital: ${bt.initialCapital} USDC`,
    `  endingValue: ${bt.endingValue} USDC`,
    `  totalReturnPct: ${bt.totalReturnPct.toFixed(2)}%`,
    `  maxDrawdownPct: ${bt.maxDrawdownPct.toFixed(2)}%`,
    `  worstMonthPct: ${bt.worstMonthPct.toFixed(2)}%`,
    `  numRebalances: ${bt.numRebalances}`,
    `  hearstRulesMode: ${bt.hearstRulesMode}`,
    `  assumptions:`,
    assumptionLines,
  ].join("\n");
}

function buildUserPrompt(input: InvestorMemoInput): string {
  const scenarioBlocks = input.scenarios.map(buildScenarioBlock).join("\n\n");
  const backtestBlocks = input.backtests.map(buildBacktestBlock).join("\n\n");

  return [
    "Produce an Investor Memo for the following vault state, scenarios, and backtests.",
    "",
    "Vault state:",
    `  aumUsdc: ${input.vault.aumUsdc}`,
    `  apyRange (use verbatim when quoting headline APY): ${formatApyRange(input.vault.apyRange)}`,
    `  mode: ${input.vault.mode}`,
    `  riskScore: ${input.vault.riskScore}`,
    "",
    `Scenarios (${input.scenarios.length}):`,
    scenarioBlocks || "  (none provided — state this explicitly in scenario_analysis)",
    "",
    `Backtests (${input.backtests.length}):`,
    backtestBlocks || "  (none provided — state this explicitly in performance_section)",
    "",
    `Generated at: ${input.generatedAt}`,
    "",
    "Return ONLY a JSON object with this exact shape (no extra keys, no markdown fences):",
    JSON.stringify(
      {
        executive_summary: "string (Markdown, 2-3 paragraphs, cites >=1 assumption)",
        vault_structure: "string (Markdown, 1-2 paragraphs, describes Cayman SPV + allocation buckets + lock-up)",
        scenario_analysis: "string (Markdown, 1 paragraph per scenario, uses APY ranges, references assumptions)",
        risk_section: "string (Markdown, covers all 5 risk dimensions: market, mining, liquidity, smart_contract, counterparty)",
        mining_section: "string (Markdown, 1-2 paragraphs, hashrate/margin/energy/uptime context)",
        performance_section: "string (Markdown, 1 paragraph per backtest, cites drawdown and total return)",
        methodology_note: "string (Markdown, 1 paragraph, references methodology version and limitations)",
        disclaimer: "string (verbatim disclaimer text, no paraphrasing)",
      },
      null,
      2,
    ),
    "",
    "Constraints:",
    "- All 8 fields must be non-empty Markdown strings.",
    "- No HTML tags anywhere in the output.",
    "- No ASCII-art tables. Use Markdown pipe tables if tabular data is needed.",
    "- APY must always be stated as a range (e.g. '8.20-11.40%'), never as a single point.",
    "- The disclaimer field must reproduce the disclaimer templates verbatim.",
    "- Every section must explicitly cite at least one assumption.",
    "- Performance section must reference totalReturnPct and maxDrawdownPct per backtest.",
  ].join("\n");
}

/**
 * Extracts the JSON object from a model response. The system prompt asks for
 * pure JSON, but we strip an accidental ```json fence defensively.
 */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced && fenced[1] !== undefined ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

export async function runInvestorMemo(
  input: InvestorMemoInput,
  opts: RunInvestorMemoOptions = {},
): Promise<InvestorMemoOutput> {
  const model = opts.model ?? INVESTOR_MEMO_MODEL;

  const { response } = await callLlm(
    "investor-memo",
    {
      model,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_INSTRUCTIONS,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: buildUserPrompt(input),
        },
      ],
    },
    { client: opts.client, timeoutMs: opts.timeoutMs ?? 180_000 },
  );

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Investor Memo agent returned no text block.");
  }

  const parsed = extractJson(textBlock.text);
  const validated = InvestorMemoOutputSchema.parse(parsed);

  assertNoForbiddenWords(validated.executive_summary);
  assertNoForbiddenWords(validated.vault_structure);
  assertNoForbiddenWords(validated.scenario_analysis);
  assertNoForbiddenWords(validated.risk_section);
  assertNoForbiddenWords(validated.mining_section);
  assertNoForbiddenWords(validated.performance_section);
  assertNoForbiddenWords(validated.methodology_note);
  assertNoForbiddenWords(validated.disclaimer);

  // Assumption citation checks (every section must cite ≥1 assumption)
  assertCitesAssumption(validated.executive_summary);
  assertCitesAssumption(validated.scenario_analysis);
  assertCitesAssumption(validated.mining_section);

  return validated;
}
