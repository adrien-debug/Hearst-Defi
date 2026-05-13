import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import {
  ScenarioNarrativeOutputSchema,
  type ScenarioNarrativeOutput,
} from "@/lib/agents/schemas";
import { METHODOLOGY_MD, METHODOLOGY_VERSION } from "@/lib/agents/system-prompts/methodology";
import {
  DISCLAIMER_NOT_GUARANTEED,
  DISCLAIMER_PROJECTION,
} from "@/lib/agents/system-prompts/disclaimers";
import { assertCitesAssumption, assertNoForbiddenWords } from "@/lib/agents/validators";

/**
 * Default model id for the Scenario Narrative Agent.
 *
 * Pinned to Sonnet 4.6 per CLAUDE.md ("Sonnet 4.6 for ops").
 * Override via `opts.model` only for evaluation / canary work; production
 * callers should leave the default.
 */
export const SCENARIO_NARRATIVE_MODEL = "claude-sonnet-4-6" as const;

/**
 * Local subset of the engine's scenario output. We deliberately re-declare
 * the shape here rather than import from `src/lib/engine` because:
 *   1) The engine package doesn't exist yet at this point in the roadmap.
 *   2) Even when it does, we want the agent surface to depend only on what
 *      it actually needs in the prompt — not the full engine type.
 */
export interface ScenarioOutputLike {
  /** APY range string, e.g. "9.4-12.8%". Never a single point. */
  apy_range: string;
  /** Allocation breakdown, percentage weights summing to ~100. */
  allocations: {
    mining_pct: number;
    usdc_base_pct: number;
    btc_tactical_pct: number;
    stable_reserve_pct: number;
  };
  /** Projected monthly USDC distribution at midpoint of APY range. */
  projected_distribution_usdc: number;
  /** Human-readable assumptions used by the engine for this run. */
  key_assumptions: string[];
}

export interface ScenarioNarrativeInput {
  /** Scenario identifier (e.g. "base", "bear", "bull", or custom id). */
  scenario_id: string;
  /** The pure-function engine output we want to narrate. */
  scenario_output: ScenarioOutputLike;
}

export interface RunScenarioNarrativeOptions {
  /**
   * Injected Anthropic client. Tests pass a mock; production callers pass a
   * shared client. If absent, we construct one inside the function (never at
   * module load) so importing this file in a non-server context doesn't
   * trigger SDK init.
   */
  client?: Anthropic;
  /** Override the default model. Default: claude-sonnet-4-6. */
  model?: string;
}

const SYSTEM_INSTRUCTIONS = `You are the Scenario Narrative Agent for Hearst Connect.

Your job is to convert a single scenario run (computed by a deterministic, pure-function engine) into a short narrative for institutional / professional investors.

Rules:
- Output STRICT JSON conforming to the schema described in the user message. No prose outside JSON.
- Never use the words: guarantee, promise, certain, will deliver, risk-free, no risk. Never imply any return is assured.
- Every narrative MUST explicitly reference at least one assumption from the input \`key_assumptions\`.
- If confidence is "low", the narrative MUST open with an explicit low-confidence note (e.g. "Note: this projection has low confidence because...").
- APY is always a RANGE, never a single point. When you quote APY, use the provided range verbatim.
- Tone: institutional, factual, concise. No marketing. No emojis.
- Methodology version: ${METHODOLOGY_VERSION}. Reference it implicitly via the methodology you were given; do not invent metrics.

Disclaimers (templated; never rewrite, never paraphrase):
${DISCLAIMER_NOT_GUARANTEED}
${DISCLAIMER_PROJECTION}

Methodology (immutable, do not contradict):
${METHODOLOGY_MD}`;

function buildUserPrompt(input: ScenarioNarrativeInput): string {
  return [
    "Produce a Scenario Narrative for the following scenario run.",
    "",
    `scenario_id: ${input.scenario_id}`,
    "scenario_output (JSON):",
    JSON.stringify(input.scenario_output, null, 2),
    "",
    "Return ONLY a JSON object with this exact shape (no extra keys, no markdown fences):",
    JSON.stringify(
      {
        narrative_md: "string (markdown, <= 2000 chars)",
        risk_warning: "string (<= 500 chars)",
        confidence: '"low" | "medium" | "high"',
        key_drivers: ["string", "string", "string (1-5 items)"],
      },
      null,
      2,
    ),
    "",
    "Constraints:",
    "- narrative_md MUST cite at least one of the key_assumptions verbatim or by clear paraphrase.",
    "- If confidence is low, narrative_md MUST begin with an explicit low-confidence note.",
    "- key_drivers are the 1-5 short bullet drivers behind the projected outcome.",
  ].join("\n");
}

/**
 * Extracts the JSON object from a model response. The system prompt asks for
 * pure JSON, but we strip an accidental ```json fence defensively rather than
 * failing the whole pipeline on a stray triple-backtick.
 */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced && fenced[1] !== undefined ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

export async function runScenarioNarrative(
  input: ScenarioNarrativeInput,
  opts: RunScenarioNarrativeOptions = {},
): Promise<ScenarioNarrativeOutput> {
  const client = opts.client ?? new Anthropic();
  const model = opts.model ?? SCENARIO_NARRATIVE_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
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
    throw new Error("Scenario Narrative agent returned no text block.");
  }

  const parsed = extractJson(textBlock.text);
  const validated = ScenarioNarrativeOutputSchema.parse(parsed);

  assertNoForbiddenWords(validated.narrative_md);
  assertNoForbiddenWords(validated.risk_warning);
  assertCitesAssumption(validated.narrative_md);

  if (validated.confidence === "low" && !/low confidence/i.test(validated.narrative_md)) {
    throw new Error(
      'Scenario Narrative has confidence "low" but narrative_md does not state ' +
        '"low confidence" explicitly. Rewrite the opening sentence.',
    );
  }

  return validated;
}
