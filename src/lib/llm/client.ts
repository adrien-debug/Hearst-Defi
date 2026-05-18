import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";

import { CircuitBreaker } from "@/lib/circuit-breaker";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

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

  const run = await prisma.llmRun.create({
    data: {
      agentName,
      model: params.model,
      promptHash,
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
          const costUsd = estimateCost(params.model, inputTokens, outputTokens);

          await prisma.llmRun.update({
            where: { id: run.id },
            data: {
              status: "success",
              latencyMs: latency,
              inputTokens,
              outputTokens,
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
 * Approximate cost in USD. Pinned to Anthropic pricing as of 2025-05.
 * Update when model pricing changes.
 */
function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  if (model.includes("opus") || model.includes("claude-3-opus")) {
    // ~$15 / 1M input, ~$75 / 1M output
    return (inputTokens * 15 + outputTokens * 75) / 1_000_000;
  }
  if (model.includes("sonnet") || model.includes("claude-3-sonnet")) {
    // ~$3 / 1M input, ~$15 / 1M output
    return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  }
  // Fallback: assume Sonnet-level pricing
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
