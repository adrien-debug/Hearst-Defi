import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import {
  InvestorMemoOutputSchema,
  type InvestorMemoOutput,
} from "@/lib/agents/schemas";
import { METHODOLOGY_MD, METHODOLOGY_VERSION } from "@/lib/agents/system-prompts/methodology";
import {
  DISCLAIMER_NOT_GUARANTEED,
  DISCLAIMER_PROJECTION,
} from "@/lib/agents/system-prompts/disclaimers";
import { assertNoForbiddenWords } from "@/lib/agents/validators";

/**
 * Default model id for the Investor Memo Agent.
 *
 * MUST be Opus 4.7. Never downgrade to Sonnet.
 * This is the highest-stakes output — an 8-page PDF delivered to institutional LPs.
 */
export const INVESTOR_MEMO_MODEL = "claude-opus-4-7" as const;

/**
 * Local subset of a scenario engine output.
 *
 * Re-declared here rather than imported from `src/lib/engine` per the same
 * rationale as scenario-narrative.ts: the agent surface depends only on what
 * it actually needs; it must never import engine internals.
 */
type ScenarioOutputLike = {
  label: string;
  apy_range: { low: number; high: number };
  projected_distribution_usdc: number;
  key_assumptions: string[];
};

type BacktestSummary = {
  key: string;
  totalReturnPct: number;
  maxDrawdownPct: number;
};

export type InvestorMemoInput = {
  vault: {
    aumUsdc: number;
    apyRange: { low: number; high: number };
    mode: string;
    riskScore: number;
  };
  scenarios: ScenarioOutputLike[];
  backtests: BacktestSummary[];
  generatedAt: string;
};

export interface RunInvestorMemoOptions {
  /**
   * Injected Anthropic client. Tests pass a mock; production callers pass a
   * shared client. If absent, we construct one inside the function (never at
   * module load) so importing this file in a non-server context doesn't
   * trigger SDK init.
   */
  client?: Anthropic;
  /**
   * Override the default model. Default: claude-opus-4-7.
   * WARNING: Never set this to a Sonnet model for production use.
   * Investor Memo is the highest-stakes output and requires Opus-level quality.
   */
  model?: string;
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

function buildUserPrompt(input: InvestorMemoInput): string {
  return [
    "Produce an Investor Memo for the following vault state, scenarios, and backtests.",
    "",
    "Vault state (JSON):",
    JSON.stringify(input.vault, null, 2),
    "",
    "Scenarios (JSON):",
    JSON.stringify(input.scenarios, null, 2),
    "",
    "Backtests (JSON):",
    JSON.stringify(input.backtests, null, 2),
    "",
    `Generated at: ${input.generatedAt}`,
    "",
    "Return ONLY a JSON object with this exact shape (no extra keys, no markdown fences):",
    JSON.stringify(
      {
        executive_summary: "string (Markdown, 2-3 paragraphs, cites ≥1 assumption)",
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
    "- APY must always be stated as a range (e.g. '8.2-11.4%'), never as a single point.",
    "- The disclaimer field must reproduce the disclaimer templates verbatim.",
    "- Every section must explicitly cite at least one assumption.",
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
  const client = opts.client ?? new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });
  const model = opts.model ?? INVESTOR_MEMO_MODEL;

  const response = await client.messages.create({
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
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Investor Memo agent returned no text block.");
  }

  const parsed = extractJson(textBlock.text);
  const validated = InvestorMemoOutputSchema.parse(parsed);

  // Post-validation: forbidden-words linter on all 8 text fields
  assertNoForbiddenWords(validated.executive_summary);
  assertNoForbiddenWords(validated.vault_structure);
  assertNoForbiddenWords(validated.scenario_analysis);
  assertNoForbiddenWords(validated.risk_section);
  assertNoForbiddenWords(validated.mining_section);
  assertNoForbiddenWords(validated.performance_section);
  assertNoForbiddenWords(validated.methodology_note);
  assertNoForbiddenWords(validated.disclaimer);

  return validated;
}
