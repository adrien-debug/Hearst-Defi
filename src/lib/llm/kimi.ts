import OpenAI from "openai";

import { env } from "@/lib/env";

/**
 * Kimi client (OpenAI-compatible) routed through Hypercli.
 *
 * Configuration is sourced exclusively from the validated env (`@/lib/env`).
 * There are NO silent placeholder fallbacks for the API key, base URL or
 * model — a missing value either throws explicitly at import (normal runtime)
 * or, only during `next build` (NEXT_PHASE === "phase-production-build"),
 * yields a stub that throws on first use so route static analysis still
 * succeeds.
 */

const IS_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Returns a Proxy-backed OpenAI instance that throws a clear error the first
 * time any property is touched. This lets module import succeed during
 * `next build`, while ensuring any runtime call fails loudly with context.
 */
function buildPlaceholderClient(reason: string): OpenAI {
  const throwStub = (): never => {
    throw new Error(reason);
  };
  const handler: ProxyHandler<object> = {
    get(_target, prop): unknown {
      if (typeof prop === "symbol") return undefined;
      return new Proxy(throwStub, handler);
    },
    apply(): never {
      return throwStub();
    },
  };
  return new Proxy({}, handler) as OpenAI;
}

function createKimi(): OpenAI {
  const apiKey = env.HYPERCLI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    const reason =
      "HYPERCLI_API_KEY is not configured. Set it in the environment to use Kimi LLM features.";
    if (IS_BUILD_PHASE) {
      return buildPlaceholderClient(reason);
    }
    throw new Error(reason);
  }

  const baseURL = env.HYPERCLI_BASE_URL;
  if (!baseURL || baseURL.trim().length === 0) {
    const reason =
      "HYPERCLI_BASE_URL is not configured. Set it in the environment to use Kimi LLM features.";
    if (IS_BUILD_PHASE) {
      return buildPlaceholderClient(reason);
    }
    throw new Error(reason);
  }

  return new OpenAI({
    apiKey,
    baseURL,
    ...(env.HYPERCLI_ORG_ID ? { organization: env.HYPERCLI_ORG_ID } : {}),
  });
}

export const kimi: OpenAI = createKimi();

export const KIMI_MODEL: string = env.HYPERCLI_DEFAULT_MODEL;
