import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";

import { CircuitBreaker } from "@/lib/circuit-breaker";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { kimi, KIMI_MODEL } from "@/lib/llm/kimi";
import { logger } from "@/lib/logger";

/**
 * Thin, auditable wrapper around the Anthropic SDK.
 *
 * Features:
 * - Configurable timeout (default 30 s)
 * - Exponential-backoff retry for 429 / 5xx
 * - Circuit breaker (opens after 5 failures, 60s cooldown)
 * - Automatic persistence to `LlmRun` for cost, latency and error tracing
 * - Graceful degradation when ANTHROPIC_API_KEY is absent
 * - Request ID propagation from async context to LlmRun logs
 *
 * Tests should inject a `client` shaped like `{ messages: { create: ... } }`
 * so they never hit the real API.
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

/** Shared circuit breaker for all Anthropic calls. */
const anthropicBreaker = new CircuitBreaker({
  name: "anthropic",
  failureThreshold: 5,
  cooldownMs: 60_000,
});

/** Subset of the Anthropic client surface we actually need. */
export interface LlmClientLike {
  messages: {
    create: (
      body: Anthropic.MessageCreateParamsNonStreaming,
      options?: { timeout?: number },
    ) => Promise<Anthropic.Messages.Message>;
  };
}

export interface LlmCallResult {
  response: Anthropic.Messages.Message;
  latencyMs: number;
  runId: string;
}

/**
 * Calls the LLM with retry, timeout, circuit breaker and observability.
 *
 * @param agentName   Logical name for the run (e.g. "investor-memo")
 * @param params      Anthropic message-create parameters
 * @param opts        Optional injected client, timeout or retry count
 */
export async function callLlm(
  agentName: string,
  params: Anthropic.MessageCreateParamsNonStreaming,
  opts?: {
    client?: LlmClientLike;
    timeoutMs?: number;
    maxRetries?: number;
    /**
     * Skip the Kimi (Hypercli) fallback that engages when Anthropic returns
     * 429/503/529 after retries are exhausted. Tests set this so a mock
     * client's failures surface directly instead of being masked by a
     * fallback. The fallback is also skipped whenever a custom `client` is
     * injected (only the real Anthropic SDK path can degrade to Kimi).
     */
    disableFallback?: boolean;
  },
): Promise<LlmCallResult> {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!opts?.client && !apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. " +
        "Set it in your environment to use LLM features.",
    );
  }

  const client = opts?.client ?? new Anthropic({ apiKey });
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES;

  const promptHash = createHash("sha256")
    .update(JSON.stringify(params.messages))
    .digest("hex")
    .slice(0, 16);

  // Hash of the (cacheable) system prompt — groups LlmRun rows by prompt
  // version so we can audit hit-rate per revision. `null` when no system
  // prompt is supplied.
  const systemPromptHash = hashSystemPrompt(params.system);

  const run = await prisma.llmRun.create({
    data: {
      agentName,
      model: params.model,
      promptHash,
      systemPromptHash,
      status: "queued",
    },
  });

  const start = performance.now();
  let lastError: unknown;

  try {
    return await anthropicBreaker.run(async () => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await client.messages.create(params, {
            timeout: timeoutMs,
          });
          const latency = Math.round(performance.now() - start);

          const inputTokens = response.usage?.input_tokens ?? 0;
          const outputTokens = response.usage?.output_tokens ?? 0;
          // Prompt-cache usage (Anthropic ephemeral cache). Both fields are
          // `null` on the SDK type when caching is disabled — coerce to a
          // nullable `number | null` for Prisma persistence.
          const cacheCreationInputTokens =
            response.usage?.cache_creation_input_tokens ?? null;
          const cacheReadInputTokens =
            response.usage?.cache_read_input_tokens ?? null;
          const costUsd = estimateCost(params.model, {
            inputTokens,
            outputTokens,
            cacheCreationInputTokens: cacheCreationInputTokens ?? 0,
            cacheReadInputTokens: cacheReadInputTokens ?? 0,
          });

          await prisma.llmRun.update({
            where: { id: run.id },
            data: {
              status: "success",
              latencyMs: latency,
              inputTokens,
              outputTokens,
              cacheCreationInputTokens,
              cacheReadInputTokens,
              costUsd,
            },
          });

          return { response, latencyMs: latency, runId: run.id };
        } catch (err) {
          lastError = err;
          const isTimeout =
            err instanceof Error &&
            err.constructor.name === "APIConnectionTimeoutError";
          const isRetryable =
            isTimeout ||
            (err instanceof Anthropic.APIError &&
              (err.status === 429 || err.status === 500 || err.status === 503));

          if (!isRetryable || attempt === maxRetries - 1) {
            break;
          }

          await sleep(Math.pow(2, attempt) * 1000);
        }
      }

      throw lastError;
    });
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    // `lastError` is undefined when circuit breaker opens before any attempt.
    // Fall back to `err` (the actual thrown value) in that case.
    const effectiveError = lastError ?? err;
    const errorMessage =
      effectiveError instanceof Error ? effectiveError.message : String(effectiveError);
    const isTimeout =
      effectiveError instanceof Error &&
      effectiveError.constructor.name === "APIConnectionTimeoutError";
    const errorType = isTimeout
      ? "timeout"
      : effectiveError instanceof Anthropic.APIError
        ? String(effectiveError.status)
        : "unknown";

    // Degrade to Kimi (Hypercli) when Anthropic is overloaded / rate-limited
    // and retries are exhausted. Only on the real SDK path: an injected
    // client (tests, canaries) or an explicit opt-out bypasses the fallback.
    const isOverloaded =
      effectiveError instanceof Anthropic.APIError &&
      (effectiveError.status === 429 ||
        effectiveError.status === 503 ||
        effectiveError.status === 529);
    const fallbackEligible =
      isOverloaded && !opts?.client && opts?.disableFallback !== true;

    if (fallbackEligible) {
      try {
        const fallbackResponse = await callKimiFallback(params, timeoutMs);
        const latencyFb = Math.round(performance.now() - start);
        logger.warn("anthropic overloaded — fell back to Kimi", {
          agentName,
          anthropicStatus: errorType,
          fallbackModel: KIMI_MODEL,
        });
        await prisma.llmRun.update({
          where: { id: run.id },
          data: {
            status: "fallback",
            model: KIMI_MODEL,
            latencyMs: latencyFb,
            inputTokens: fallbackResponse.usage?.input_tokens ?? 0,
            outputTokens: fallbackResponse.usage?.output_tokens ?? 0,
          },
        });
        return {
          response: fallbackResponse,
          latencyMs: latencyFb,
          runId: run.id,
        };
      } catch (fbErr) {
        logger.error(
          "Kimi fallback also failed",
          { agentName, fallbackModel: KIMI_MODEL },
          fbErr,
        );
        // fall through to mark the run failed with the original error
      }
    }

    await prisma.llmRun.update({
      where: { id: run.id },
      data: {
        status: isTimeout ? "timeout" : "failed",
        latencyMs: latency,
        errorType,
        errorMessage: errorMessage.slice(0, 1000),
      },
    });

    throw effectiveError;
  }
}

/**
 * Flattens an Anthropic system prompt (string or content-block array) into a
 * single plain-text string for the OpenAI-compatible Kimi endpoint.
 */
function flattenSystem(
  system: Anthropic.MessageCreateParamsNonStreaming["system"],
): string {
  if (system === undefined) return "";
  if (typeof system === "string") return system;
  return system
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n\n");
}

/**
 * Flattens an Anthropic message content (string or content-block array) into a
 * single plain-text string. Non-text blocks are dropped — Kimi fallback is a
 * text-in/text-out degradation path only.
 */
function flattenContent(content: Anthropic.MessageParam["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((block) => (block.type === "text" ? block.text : ""))
    .filter((s) => s.length > 0)
    .join("\n\n");
}

/**
 * Calls Kimi via the OpenAI-compatible Hypercli endpoint and adapts the
 * response back into the Anthropic `Message` shape the callers expect
 * (they only read `content` text blocks + `usage`).
 */
async function callKimiFallback(
  params: Anthropic.MessageCreateParamsNonStreaming,
  timeoutMs: number,
): Promise<Anthropic.Messages.Message> {
  const systemText = flattenSystem(params.system);
  const chatMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [];
  if (systemText.length > 0) {
    chatMessages.push({ role: "system", content: systemText });
  }
  for (const m of params.messages) {
    chatMessages.push({
      role: m.role,
      content: flattenContent(m.content),
    });
  }

  const completion = await kimi.chat.completions.create(
    {
      model: KIMI_MODEL,
      max_tokens: params.max_tokens,
      messages: chatMessages,
    },
    { timeout: timeoutMs },
  );

  const text = completion.choices[0]?.message?.content ?? "";
  const message: Anthropic.Messages.Message = {
    id: completion.id,
    type: "message",
    role: "assistant",
    model: KIMI_MODEL,
    content: [{ type: "text", text, citations: null }],
    container: null,
    stop_reason: "end_turn",
    stop_details: null,
    stop_sequence: null,
    usage: {
      input_tokens: completion.usage?.prompt_tokens ?? 0,
      output_tokens: completion.usage?.completion_tokens ?? 0,
      cache_creation: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      inference_geo: null,
      server_tool_use: null,
      service_tier: null,
    },
  };
  return message;
}

/**
 * Per-million-token USD pricing per model family. Source: Anthropic pricing
 * page (https://docs.anthropic.com/en/docs/about-claude/pricing) and
 * prompt-caching docs (https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching#pricing).
 *
 * Anthropic prompt caching adjusts the per-token rate:
 *   - cache_write tokens  = input * CACHE_WRITE_MULTIPLIER (1.25×)
 *   - cache_read  tokens  = input * CACHE_READ_MULTIPLIER  (0.10×)
 *   - regular input/output tokens unchanged
 */
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

interface ModelPricing {
  /** USD per 1M input tokens (regular, non-cached). */
  input: number;
  /** USD per 1M output tokens. */
  output: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  opus: { input: 15, output: 75 },
  sonnet: { input: 3, output: 15 },
};

function resolvePricing(model: string): ModelPricing {
  if (model.includes("opus") || model.includes("claude-3-opus")) {
    return MODEL_PRICING.opus!;
  }
  // Default to Sonnet-tier pricing for any non-Opus model (Sonnet 4.x, Haiku,
  // Kimi fallback, unknowns). Kimi tokens are persisted with the Kimi model
  // name so cost reports can still be filtered downstream.
  return MODEL_PRICING.sonnet!;
}

interface TokenBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

/**
 * Approximate cost in USD, factoring Anthropic prompt-cache pricing.
 *
 * `inputTokens` from `response.usage.input_tokens` is the *regular* input
 * count and is already net of cached tokens — Anthropic reports cached
 * tokens separately. Cost components are summed accordingly.
 */
function estimateCost(model: string, tokens: TokenBreakdown): number {
  const pricing = resolvePricing(model);
  const regular = tokens.inputTokens * pricing.input;
  const cacheWrite =
    tokens.cacheCreationInputTokens * pricing.input * CACHE_WRITE_MULTIPLIER;
  const cacheRead =
    tokens.cacheReadInputTokens * pricing.input * CACHE_READ_MULTIPLIER;
  const output = tokens.outputTokens * pricing.output;
  return (regular + cacheWrite + cacheRead + output) / 1_000_000;
}

/**
 * Stable hash of the system prompt blocks. Used to group LlmRun rows by
 * prompt version (cache hit-rate audit). Returns `null` when no system
 * prompt is supplied so the column stays NULL rather than hashing an empty
 * string.
 */
function hashSystemPrompt(
  system: Anthropic.MessageCreateParamsNonStreaming["system"],
): string | null {
  if (system === undefined) return null;
  const text =
    typeof system === "string"
      ? system
      : system
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("\n\n");
  if (text.length === 0) return null;
  return createHash("sha256").update(text).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
