import { z } from "zod";

/**
 * Zod schemas + inferred TypeScript types for every Hearst Connect agent.
 *
 * Rules of the road:
 * - Every agent returns a STRUCTURED JSON object that conforms to one of
 *   these schemas. No free-form text.
 * - `confidence: "low"` must be addressed explicitly in the narrative
 *   (enforced separately by validators / prompts, not the schema).
 * - We use `.strict()` so unknown keys from the model trigger a Zod failure.
 */

/* -------------------------------------------------------------------------- */
/* Scenario Narrative Agent (Sonnet 4.6)                                       */
/* -------------------------------------------------------------------------- */

export const ScenarioNarrativeOutputSchema = z
  .object({
    narrative_md: z.string().min(1).max(2000),
    risk_warning: z.string().min(1).max(500),
    confidence: z.enum(["low", "medium", "high"]),
    key_drivers: z.array(z.string().min(1).max(200)).min(1).max(5),
  })
  .strict();

export type ScenarioNarrativeOutput = z.infer<typeof ScenarioNarrativeOutputSchema>;

/* -------------------------------------------------------------------------- */
/* Mining Health Agent (Sonnet 4.6)                                            */
/* -------------------------------------------------------------------------- */

export const MiningHealthOutputSchema = z
  .object({
    alert_level: z.enum(["green", "amber", "red"]),
    summary: z.string().min(1).max(1000),
    recommendation: z.string().min(1).max(500),
  })
  .strict();

export type MiningHealthOutput = z.infer<typeof MiningHealthOutputSchema>;

/* -------------------------------------------------------------------------- */
/* Risk Explanation Agent (Sonnet 4.6)                                         */
/* -------------------------------------------------------------------------- */

export const RiskExplanationOutputSchema = z
  .object({
    top_risks: z
      .array(
        z
          .object({
            risk_id: z.string().min(1),
            name: z.string().min(1),
            explanation: z.string().min(1),
            suggested_guardrail: z.string().min(1),
          })
          .strict(),
      )
      .min(1)
      .max(2),
    overall_summary: z.string().min(1),
  })
  .strict();

export type RiskExplanationOutput = z.infer<typeof RiskExplanationOutputSchema>;

/* -------------------------------------------------------------------------- */
/* Investor Memo Agent (Opus 4.7)                                              */
/* -------------------------------------------------------------------------- */

export const InvestorMemoOutputSchema = z
  .object({
    executive_summary: z.string().min(1),
    vault_structure: z.string().min(1),
    scenario_analysis: z.string().min(1),
    risk_section: z.string().min(1),
    mining_section: z.string().min(1),
    performance_section: z.string().min(1),
    methodology_note: z.string().min(1),
    disclaimer: z.string().min(1),
  })
  .strict();

export type InvestorMemoOutput = z.infer<typeof InvestorMemoOutputSchema>;
