import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { runScenario } from "@/lib/engine/scenario";
import type { ScenarioInputs, ScenarioOutput } from "@/lib/engine/types";
import { runScenarioNarrative } from "@/lib/agents/scenario-narrative";
import type { ScenarioNarrativeOutput } from "@/lib/agents/schemas";
import { logger } from "@/lib/logger";
import { assertRateLimit } from "@/lib/rate-limit";

/**
 * Scenario Lab — single-run API.
 *
 * Exposes the deterministic `runScenario()` engine + the Scenario Narrative
 * Agent to the Scenario Lab UI. Mirrors the auth + rate-limit pattern used by
 * /api/cockpit-chat (userId-keyed, defence-in-depth at the route).
 *
 * Flow:
 *   1. requireAuth() — Privy JWT → userId (401 on failure)
 *   2. assertRateLimit by userId — 10/min (429 on excess)
 *   3. Zod-validate body (5-slider ScenarioInputs, see /docs/spec/02-scenario-lab.mdx)
 *   4. runScenario(input) — pure-function engine (sync)
 *   5. Persist ScenarioRun row (output JSON-stringified)
 *   6. runScenarioNarrative({ scenario_id, scenario_output }) — Sonnet 4.6
 *      with graceful degradation: if the agent throws (timeout, forbidden-words
 *      filter, schema fail), the run still returns the engine output with
 *      `narrative: null` and the error is logged.
 *   7. Update ScenarioRun with the narrative JSON if produced
 *   8. Return { id, output, narrative }
 *
 * Node runtime (Prisma + Anthropic SDK both require it). Force-dynamic — never
 * cached, every run mutates state.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-user rate-limit: 10 scenario runs per 60-second window. Keyed on the
// authenticated userId (NOT the IP) — matches the cockpit-chat arbitrage so
// corporate-NAT users don't share a bucket.
const SCENARIO_RATE_MAX = 10;
const SCENARIO_RATE_WINDOW_MS = 60_000;

// Slider bounds from /docs/spec/02-scenario-lab.mdx (+ engine ScenarioInputs).
// Use range matching the Server Action `assertBounds` to stay consistent.
const ScenarioInputsSchema = z
  .object({
    btc_price_change_pct: z.number().min(-100).max(300),
    hashprice_usd_th_day: z.number().min(0.01).max(1000),
    energy_cost_kwh: z.number().min(0.01).max(1),
    stable_apy_pct: z.number().min(0).max(30),
    vol_index: z.number().min(0).max(100),
  })
  .strict();

const ScenarioRunRequestSchema = z
  .object({
    inputs: ScenarioInputsSchema,
    scenarioId: z.string().min(1).max(120).optional(),
  })
  .strict();

interface ScenarioRunResponse {
  id: string;
  output: ScenarioOutput;
  narrative: ScenarioNarrativeOutput | null;
}

function jsonResponse(body: unknown, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(extraHeaders ?? {}) },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  // 1. Auth — 401 on missing/invalid Privy JWT.
  let userId: string;
  try {
    const auth = await requireAuth();
    userId = auth.userId;
  } catch (err) {
    logger.warn(
      "scenario.run auth rejected",
      {},
      err instanceof Error ? err : undefined,
    );
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  // 2. Rate-limit — 10/min per userId, 429 with Retry-After.
  try {
    await assertRateLimit(
      `scenario-run:${userId}`,
      SCENARIO_RATE_MAX,
      SCENARIO_RATE_WINDOW_MS,
    );
  } catch {
    return jsonResponse(
      { error: "Rate limit exceeded. Try again in a moment." },
      429,
      { "Retry-After": String(Math.ceil(SCENARIO_RATE_WINDOW_MS / 1000)) },
    );
  }

  // 3. Parse + validate body.
  let inputs: ScenarioInputs;
  let scenarioId: string;
  try {
    const raw: unknown = await req.json();
    const parsed = ScenarioRunRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse(
        {
          error: "Invalid request body",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    }
    inputs = parsed.data.inputs;
    scenarioId = parsed.data.scenarioId ?? "custom";
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // 4. Run the deterministic engine. Pure-function, sync — but wrap in try
  //    so an engine assertion (e.g. forbidden-words on assumptions) becomes a
  //    500 instead of crashing the route.
  let output: ScenarioOutput;
  try {
    output = runScenario(inputs, { now: new Date() });
  } catch (err) {
    logger.error(
      "scenario.run engine failed",
      { userId, scenarioId },
      err instanceof Error ? err : undefined,
    );
    return jsonResponse({ error: "Scenario engine failed" }, 500);
  }

  // 5. Persist ScenarioRun.
  let runId: string;
  try {
    const run = await prisma.scenarioRun.create({
      data: {
        userId,
        inputs: JSON.stringify(inputs),
        outputs: JSON.stringify(output),
        status: "completed",
        confidence: output.confidence,
      },
      select: { id: true },
    });
    runId = run.id;
  } catch (persistErr) {
    // Persistence is required to get a stable runId for the response — fail
    // loudly here rather than returning an unidentified result.
    logger.error(
      "scenario.run persistence failed",
      { userId, scenarioId },
      persistErr instanceof Error ? persistErr : undefined,
    );
    return jsonResponse({ error: "Could not persist scenario run" }, 500);
  }

  logger.info("scenario.run completed (engine)", {
    userId,
    runId,
    scenarioId,
    mode: output.mode,
    apyLow: output.apy_range.low,
    apyHigh: output.apy_range.high,
    confidence: output.confidence,
  });

  // 6. Run the narrative agent. Graceful degradation: if Anthropic is down,
  //    the schema validation fails, or the forbidden-words filter trips, we
  //    log + return the engine result with `narrative: null`. The Scenario
  //    Lab UI MUST tolerate this null and degrade gracefully.
  let narrative: ScenarioNarrativeOutput | null = null;
  try {
    narrative = await runScenarioNarrative({
      scenario_id: scenarioId,
      scenario_output: output,
    });

    // 7. Persist narrative on the existing ScenarioRun row.
    try {
      await prisma.scenarioRun.update({
        where: { id: runId },
        data: {
          narrative: narrative.narrative_md,
          riskWarning: narrative.risk_warning,
          confidence: narrative.confidence,
        },
      });
    } catch (updateErr) {
      // Narrative was produced but couldn't be persisted — still return it.
      logger.warn(
        "scenario.run narrative persistence failed",
        { userId, runId },
        updateErr instanceof Error ? updateErr : undefined,
      );
    }
  } catch (agentErr) {
    logger.error(
      "scenario.run narrative agent failed",
      { userId, runId, scenarioId },
      agentErr instanceof Error ? agentErr : undefined,
    );
    narrative = null;
  }

  const body: ScenarioRunResponse = { id: runId, output, narrative };
  return jsonResponse(body, 200);
}
