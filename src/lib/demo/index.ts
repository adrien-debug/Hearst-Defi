import "server-only";

import { cookies } from "next/headers";

/**
 * Demo mode — drop-in fallback that swaps every live data loader for a set of
 * deterministic, institution-grade fixtures so Adrien can present the platform
 * without exposing real vault state or depending on the production DB.
 *
 * Activation precedence (highest first):
 *   1. `DEMO_MODE_DEFAULT=1` env var (forces demo on every request, no opt-out
 *      from the browser — useful for a dedicated /demo deployment).
 *   2. `hearst-demo-mode=1` cookie (per-browser opt-in, 24h TTL).
 *
 * Toggle is wired via `src/app/actions/demo.ts` (Server Action).
 *
 * Never hits the DB. Never throws. Never logs PII.
 */

const COOKIE_NAME = "hearst-demo-mode";

/**
 * True when demo mode is active for the current request.
 *
 * Server-side only — relies on `next/headers#cookies()` which is a Server
 * Component / Server Action / Route Handler API. Calling this from a client
 * component will throw at runtime (and `import "server-only"` makes the type
 * checker complain at build time before that happens).
 */
export async function isDemoMode(): Promise<boolean> {
  if (process.env.DEMO_MODE_DEFAULT === "1") return true;
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === "1";
}

/**
 * Wraps a real loader with a demo-mode fallback.
 *
 * In demo mode the real loader is **never invoked** — we want to be safe even
 * when the DB is offline or credentials are missing on a fresh box. The demo
 * data can be either a value or a (sync/async) thunk so callers can pay the
 * deserialisation cost only when actually in demo mode.
 */
export async function withDemoFallback<T>(
  realLoader: () => Promise<T>,
  demoData: T | (() => T | Promise<T>),
): Promise<T> {
  if (await isDemoMode()) {
    return typeof demoData === "function"
      ? await (demoData as () => T | Promise<T>)()
      : demoData;
  }
  return realLoader();
}

export { COOKIE_NAME as DEMO_COOKIE_NAME };
