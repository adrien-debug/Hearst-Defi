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
import type { ScenarioOutput } from "@/lib/engine/types";

/**
 * Default model id for the Scenario Narrative Agent.
 *
 * Pinned to Sonnet 4.6 per CLAUDE.md ("Sonnet 4.6 for ops").
 * Override via `opts.model` only for evaluation / canary work; production
 * callers should leave the default.
 */
export const SCENARIO_NARRATIVE_MODEL = "claude-sonnet-4-6" as const;

export interface ScenarioNarrativeInput {
  /** Scenario identifier (e.g. "base", "bear", "bull", or custom id). */
  scenario_id: string;
  /** The pure-function engine output we want to narrate. */
  scenario_output: ScenarioOutput;
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

function formatApyRange(range: { low: number; high: number }): string {
  return `${range.low.toFixed(2)}-${range.high.toFixed(2)}%`;
}

function buildUserPrompt(input: ScenarioNarrativeInput): string {
  const out = input.scenario_output;
  return [
    "Produce a Scenario Narrative for the following scenario run.",
    "",
    `scenario_id: ${input.scenario_id}`,
    "",
    "scenario_output (engine, JSON):",
    JSON.stringify(out, null, 2),
    "",
    "Pre-computed fields for convenience (use these verbatim where applicable):",
    `- apy_range (formatted, use verbatim when quoting APY): ${formatApyRange(out.apy_range)}`,
    `- stressed_apy: ${out.stressed_apy.toFixed(2)}%`,
    `- risk_score: ${out.risk_score}`,
    `- mining_margin_score: ${out.mining_margin_score}`,
    `- mode: ${out.mode}`,
    `- confidence (engine-provided, narrate accordingly): ${out.confidence}`,
    "",
    "Allocations (bucket / pct / yield_contribution_bps):",
    ...out.allocations.map(
      (a) => `- ${a.bucket}: ${a.pct}% (yield_contribution=${a.yield_contribution_bps}bps)`,
    ),
    "",
    "Engine assumptions (cite at least one of these verbatim or by clear paraphrase):",
    ...out.assumptions.map((a) => `- ${a}`),
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
    "- narrative_md MUST cite at least one of the engine assumptions verbatim or by clear paraphrase.",
    "- When quoting APY, use the formatted apy_range above (range, never single point).",
    "- If confidence is low, narrative_md MUST begin with an explicit low-confidence note.",
    "- key_drivers are the 1-5 short bullet drivers behind the projected outcome.",
    "- The confidence field in your output SHOULD generally match the engine confidence; deviate only if the narrative reveals a stronger or weaker signal and state the reason in narrative_md.",
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
  const client = opts.client ?? new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });
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
