import OpenAI from "openai";

import { env } from "@/lib/env";

/**
 * Kimi client (OpenAI-compatible) routed through Hypercli.
 *
 * Configuration is sourced from the validated env. No silent placeholder
 * fallbacks: if the API key is absent at runtime, the client throws on first
 * use. During `next build` (NEXT_PHASE === "phase-production-build"), Next.js
 * statically analyses every route module, so we tolerate a stub client at
 * import time and only fail at runtime use.
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
  // Single handler reused for both the object base and the nested callable
  // proxies, so it must be typed against a callable object target.
  const handler: ProxyHandler<object> = {
    get(_target, prop): unknown {
      // Allow Symbol-based introspection (e.g. inspect) to no-op
      if (typeof prop === "symbol") return undefined;
      return new Proxy(throwStub, handler);
    },
    apply(): never {
      return throwStub();
    },
  };
  // The base of the proxy is irrelevant — every access is intercepted.
  return new Proxy({}, handler) as OpenAI;
}

function createKimi(): OpenAI {
  // Treat empty / whitespace-only keys as unconfigured. The Zod schema marks
  // HYPERCLI_API_KEY `.optional()` (so the build placeholder still parses),
  // and the test-mode lenient env path can surface `""`. A truthiness check
  // alone is not enough — guard on trimmed length so a blank key never
  // produces a half-configured OpenAI client that 401s opaquely at runtime.
  const apiKey = env.HYPERCLI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    const reason =
      "HYPERCLI_API_KEY is not configured. Set it in the environment to use Kimi LLM features.";
    if (IS_BUILD_PHASE) {
      return buildPlaceholderClient(reason);
    }
    throw new Error(reason);
  }
  if (!env.HYPERCLI_BASE_URL) {
    const reason =
      "HYPERCLI_BASE_URL is not configured. Set it in the environment to use Kimi LLM features.";
    if (IS_BUILD_PHASE) {
      return buildPlaceholderClient(reason);
    }
    throw new Error(reason);
  }

  return new OpenAI({
    apiKey,
    baseURL: env.HYPERCLI_BASE_URL,
    ...(env.HYPERCLI_ORG_ID ? { organization: env.HYPERCLI_ORG_ID } : {}),
  });
}

export const kimi: OpenAI = createKimi();

export const KIMI_MODEL: string = env.HYPERCLI_DEFAULT_MODEL;
